import "server-only";
import type { PointKind, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Review rewards. Points are earned only for verified reviews (approved with
 * at least one approved proof), never depend on the star rating, and become
 * available 30 days after they are earned. Points stop counting if their
 * review is later suspended or rejected.
 *
 * Points have a fixed cash value: every POINTS_PER_PAYOUT available points
 * can be redeemed for PAYOUT_RUPEES (1,000 points = ₹100, so ₹0.10 a point),
 * paid straight to the user's UPI or bank account. There is no wallet:
 * KiraayaSense never holds the money. The payout itself is not built yet, so
 * the Redeem button shows "coming soon". Rewards are never tied to ad views
 * or clicks.
 */

export const POINTS = { VERIFIED_REVIEW: 10, PHOTO: 5, HELPFUL_VOTE: 1 } as const;
export const MAX_HELPFUL_POINTS_PER_REVIEW = 20;
export const MAX_REWARDED_REVIEWS_PER_DAY = 10;
export const HOLD_DAYS = 30;
export const POINTS_PER_PAYOUT = 1000;
export const PAYOUT_RUPEES = 100;
export const RUPEES_PER_POINT = PAYOUT_RUPEES / POINTS_PER_PAYOUT;

/** Rupee value of `points`, e.g. 1234 -> "₹123.40", 1000 -> "₹100". */
export function formatRupees(points: number): string {
  const paise = points * RUPEES_PER_POINT * 100;
  const rupees = Math.round(paise) / 100;
  return `₹${rupees.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export interface PayoutProgress {
  /** Whole ₹100 payouts the available points already cover. */
  payoutsReady: number;
  /** Available points toward the next payout (0..POINTS_PER_PAYOUT-1). */
  availableInStep: number;
  /** Pending points that will land in the next payout step once their hold ends. */
  pendingInStep: number;
  /** Points still to earn (beyond pending) for the next ₹100. */
  toEarn: number;
}

export function payoutProgress(available: number, pending: number): PayoutProgress {
  const payoutsReady = Math.floor(available / POINTS_PER_PAYOUT);
  const availableInStep = available % POINTS_PER_PAYOUT;
  const pendingInStep = Math.min(pending, POINTS_PER_PAYOUT - availableInStep);
  const toEarn = POINTS_PER_PAYOUT - availableInStep - pendingInStep;
  return { payoutsReady, availableInStep, pendingInStep, toEarn };
}

/** Verified reviews with a photo (the best case) needed to earn `points`. */
export const reviewsWithPhotoFor = (points: number) =>
  Math.ceil(points / (POINTS.VERIFIED_REVIEW + POINTS.PHOTO));

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
  | { ok: true; helpful: boolean; count: number; created: boolean }
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
    let created = false;
    if (helpful) {
      const existing = await tx.helpfulVote.findUnique({ where: key });
      if (!existing) {
        await tx.helpfulVote.create({ data: { reviewId, userId: voterId } });
        created = true;
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
    return { ok: true, helpful, count, created } as const;
  });
}

// Only events whose review is still approved count.
const liveEvents = (userId: string): Prisma.PointEventWhereInput => ({ userId, review: { status: "APPROVED" } });

export async function totalPoints(userId: string): Promise<number> {
  const agg = await prisma.pointEvent.aggregate({ where: liveEvents(userId), _sum: { points: true } });
  return agg._sum.points ?? 0;
}

/** Available and held points, for the profile page. */
export async function pointsBalance(userId: string, now = new Date()) {
  const [available, pending, nextUnlock] = await Promise.all([
    prisma.pointEvent.aggregate({ where: { ...liveEvents(userId), availableAt: { lte: now } }, _sum: { points: true } }),
    prisma.pointEvent.aggregate({ where: { ...liveEvents(userId), availableAt: { gt: now } }, _sum: { points: true } }),
    prisma.pointEvent.findFirst({
      where: { ...liveEvents(userId), availableAt: { gt: now } },
      orderBy: { availableAt: "asc" },
      select: { availableAt: true },
    }),
  ]);
  const a = available._sum.points ?? 0;
  const p = pending._sum.points ?? 0;
  let next: { at: Date; points: number } | null = null;
  if (nextUnlock) {
    // Everything that unlocks on the same (IST) day as the earliest held point.
    const ist = 5.5 * 60 * 60 * 1000;
    const dayEnd = new Date(Math.floor((nextUnlock.availableAt.getTime() + ist) / DAY_MS + 1) * DAY_MS - ist);
    const sameDay = await prisma.pointEvent.aggregate({
      where: { ...liveEvents(userId), availableAt: { gt: now, lt: dayEnd } },
      _sum: { points: true },
    });
    next = { at: nextUnlock.availableAt, points: sameDay._sum.points ?? 0 };
  }
  return { total: a + p, available: a, pending: p, nextUnlock: next };
}

export interface RewardsSummary {
  total: number;
  available: number;
  pending: number;
  nextUnlock: { at: Date; points: number } | null;
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
  const [balance, history] = await Promise.all([
    pointsBalance(userId, now),
    prisma.pointEvent.findMany({
      where: liveEvents(userId),
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { review: { select: { property: { select: { id: true, name: true } } } } },
    }),
  ]);
  return {
    ...balance,
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
