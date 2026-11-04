import "server-only";
import type { PointKind, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Review rewards. Points are earned only for verified reviews (approved with
 * at least one approved proof), never depend on the star rating, and become
 * available 30 days after they are earned. Points stop counting if their
 * review is later suspended or rejected.
 *
 * Cash is a later switch: REWARDS_CASH_ENABLED=true shows the UPI withdrawal.
 * When it is on, each month's pool is POOL_SHARE of that month's ad income,
 * split by share of points. Rewards are never tied to ad views or clicks.
 */

export const POINTS = { VERIFIED_REVIEW: 10, PHOTO: 5, HELPFUL_VOTE: 1 } as const;
export const MAX_HELPFUL_POINTS_PER_REVIEW = 20;
export const MAX_REWARDED_REVIEWS_PER_DAY = 10;
export const HOLD_DAYS = 30;
export const POOL_SHARE = 0.25;
export const MIN_WITHDRAWAL_RUPEES = 100;

export const cashRewardsEnabled = () => process.env.REWARDS_CASH_ENABLED === "true";

const DAY_MS = 24 * 60 * 60 * 1000;
const availableFrom = (now: Date) => new Date(now.getTime() + HOLD_DAYS * DAY_MS);

type Tx = Prisma.TransactionClient;

async function give(tx: Tx, userId: string, reviewId: string, kind: PointKind, dedupeKey: string, now: Date) {
  await tx.pointEvent.upsert({
    where: { dedupeKey },
    update: {},
    create: { userId, reviewId, kind, points: POINTS[kind], dedupeKey, availableAt: availableFrom(now) },
  });
}

/** Call inside the moderation transaction after a review is approved. */
export async function awardApprovedReview(tx: Tx, reviewId: string, now = new Date()): Promise<number> {
  const review = await tx.review.findUnique({
    where: { id: reviewId },
    include: { proofs: { select: { status: true } }, media: { select: { kind: true, status: true } } },
  });
  if (!review || review.status !== "APPROVED") return 0;
  if (!review.proofs.some((p) => p.status === "APPROVED")) return 0;

  // At most MAX_REWARDED_REVIEWS_PER_DAY reviews earn points per day (IST),
  // counted by the day each review was written.
  const ist = 5.5 * 60 * 60 * 1000;
  const dayStart = new Date(Math.floor((review.createdAt.getTime() + ist) / DAY_MS) * DAY_MS - ist);
  const sameDay = await tx.pointEvent.count({
    where: {
      userId: review.userId,
      kind: "VERIFIED_REVIEW",
      reviewId: { not: review.id },
      review: { createdAt: { gte: dayStart, lt: new Date(dayStart.getTime() + DAY_MS) } },
    },
  });
  if (sameDay >= MAX_REWARDED_REVIEWS_PER_DAY) return 0;

  let total = POINTS.VERIFIED_REVIEW;
  await give(tx, review.userId, review.id, "VERIFIED_REVIEW", `VERIFIED_REVIEW:${review.id}`, now);
  if (review.media.some((m) => m.kind === "PHOTO" && m.status === "APPROVED")) {
    await give(tx, review.userId, review.id, "PHOTO", `PHOTO:${review.id}`, now);
    total += POINTS.PHOTO;
  }
  return total;
}

export type HelpfulResult =
  | { ok: true; helpful: boolean; count: number }
  | { ok: false; status: number; code: string; message: string };

/** Marks or unmarks a review as helpful for `voterId`. */
export async function setHelpful(reviewId: string, voterId: string, helpful: boolean): Promise<HelpfulResult> {
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.findUnique({
      where: { id: reviewId },
      select: { id: true, userId: true, status: true, pointEvents: { where: { kind: "VERIFIED_REVIEW" }, select: { id: true } } },
    });
    if (!review || review.status !== "APPROVED") {
      return { ok: false, status: 404, code: "NOT_FOUND", message: "Review not found" } as const;
    }
    if (review.userId === voterId) {
      return { ok: false, status: 403, code: "OWN_REVIEW", message: "You can't mark your own review as helpful" } as const;
    }

    const key = { reviewId_userId: { reviewId, userId: voterId } };
    const dedupeKey = `HELPFUL_VOTE:${reviewId}:${voterId}`;
    if (helpful) {
      const existing = await tx.helpfulVote.findUnique({ where: key });
      if (!existing) {
        await tx.helpfulVote.create({ data: { reviewId, userId: voterId } });
        // Only rewarded (verified) reviews earn helpful points, up to the cap.
        if (review.pointEvents.length > 0) {
          const earned = await tx.pointEvent.count({ where: { reviewId, kind: "HELPFUL_VOTE" } });
          if (earned < MAX_HELPFUL_POINTS_PER_REVIEW) {
            await give(tx, review.userId, reviewId, "HELPFUL_VOTE", dedupeKey, new Date());
          }
        }
      }
    } else {
      await tx.helpfulVote.deleteMany({ where: { reviewId, userId: voterId } });
      await tx.pointEvent.deleteMany({ where: { dedupeKey } });
    }
    const count = await tx.helpfulVote.count({ where: { reviewId } });
    return { ok: true, helpful, count } as const;
  });
}

// Only events whose review is still approved count.
const liveEvents = (userId: string): Prisma.PointEventWhereInput => ({ userId, review: { status: "APPROVED" } });

export async function totalPoints(userId: string): Promise<number> {
  const agg = await prisma.pointEvent.aggregate({ where: liveEvents(userId), _sum: { points: true } });
  return agg._sum.points ?? 0;
}

export interface RewardsSummary {
  total: number;
  available: number;
  pending: number;
  history: {
    id: string;
    kind: PointKind;
    points: number;
    createdAt: Date;
    availableAt: Date;
    business: { id: string; name: string };
  }[];
}

export async function rewardsSummary(userId: string, now = new Date()): Promise<RewardsSummary> {
  const [available, pending, history] = await Promise.all([
    prisma.pointEvent.aggregate({ where: { ...liveEvents(userId), availableAt: { lte: now } }, _sum: { points: true } }),
    prisma.pointEvent.aggregate({ where: { ...liveEvents(userId), availableAt: { gt: now } }, _sum: { points: true } }),
    prisma.pointEvent.findMany({
      where: liveEvents(userId),
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { review: { select: { property: { select: { id: true, name: true } } } } },
    }),
  ]);
  const a = available._sum.points ?? 0;
  const p = pending._sum.points ?? 0;
  return {
    total: a + p,
    available: a,
    pending: p,
    history: history.map((e) => ({
      id: e.id,
      kind: e.kind,
      points: e.points,
      createdAt: e.createdAt,
      availableAt: e.availableAt,
      business: e.review.property,
    })),
  };
}

/** Reviews (among `reviewIds`) that earned points, and their helpful counts. */
export async function reviewRewardInfo(reviewIds: string[], viewerId?: string) {
  if (reviewIds.length === 0) return { rewarded: new Set<string>(), helpful: new Map<string, number>(), votedByViewer: new Set<string>() };
  const [rewarded, counts, mine] = await Promise.all([
    prisma.pointEvent.findMany({ where: { reviewId: { in: reviewIds }, kind: "VERIFIED_REVIEW" }, select: { reviewId: true } }),
    prisma.helpfulVote.groupBy({ by: ["reviewId"], where: { reviewId: { in: reviewIds } }, _count: { _all: true } }),
    viewerId
      ? prisma.helpfulVote.findMany({ where: { userId: viewerId, reviewId: { in: reviewIds } }, select: { reviewId: true } })
      : Promise.resolve([]),
  ]);
  return {
    rewarded: new Set(rewarded.map((r) => r.reviewId)),
    helpful: new Map(counts.map((c) => [c.reviewId, c._count._all])),
    votedByViewer: new Set(mine.map((m) => m.reviewId)),
  };
}
