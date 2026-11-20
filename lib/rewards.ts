import "server-only";
import type { PointKind, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Rewards. Review points are earned only for verified reviews (approved with
 * at least one approved proof), never depend on the star rating, and stop
 * counting if their review is later suspended or rejected. There are also
 * account points: a welcome bonus on sign-up, a referral bonus when someone
 * joins with your invite link, and a point for opening the app each day.
 * Every point becomes available 30 days after it is earned.
 *
 * Points have a fixed cash value: every POINTS_PER_PAYOUT available points
 * can be redeemed for PAYOUT_RUPEES (1,000 points = ₹100, so ₹0.10 a point),
 * paid straight to the user's UPI or bank account. There is no wallet:
 * KiraayaSense never holds the money. The payout itself is not built yet, so
 * the Redeem button shows "coming soon". Rewards are never tied to ad views
 * or clicks.
 */

export const POINTS = { VERIFIED_REVIEW: 10, PHOTO: 5, HELPFUL_VOTE: 1, SIGNUP: 50, REFERRAL: 5, DAILY_OPEN: 1 } as const;
/** Referral bonuses one person can earn per IST day (guards against account farming). */
export const MAX_REFERRALS_PER_DAY = 10;
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
const IST_MS = 5.5 * 60 * 60 * 1000;
const availableFrom = (now: Date) => new Date(now.getTime() + HOLD_DAYS * DAY_MS);

/** Start of the IST calendar day that `d` falls in. */
export const istDayStart = (d: Date) => new Date(Math.floor((d.getTime() + IST_MS) / DAY_MS) * DAY_MS - IST_MS);
/** "2026-11-20" for the IST day that `d` falls in. */
export const istDayKey = (d: Date) => new Date(d.getTime() + IST_MS).toISOString().slice(0, 10);

type Tx = Prisma.TransactionClient;

async function give(
  tx: Tx,
  userId: string,
  reviewId: string | null,
  kind: PointKind,
  dedupeKey: string,
  now: Date,
  sourceUserId: string | null = null
): Promise<boolean> {
  // createMany + skipDuplicates is an INSERT … ON CONFLICT DO NOTHING, so two
  // racing requests can never both earn the same reward.
  const { count } = await tx.pointEvent.createMany({
    data: [{ userId, reviewId, sourceUserId, kind, points: POINTS[kind], dedupeKey, availableAt: availableFrom(now) }],
    skipDuplicates: true,
  });
  return count > 0;
}

/** Turns "ab12 cd34" or a full invite URL's code into the stored form, or null. */
export function normalizeReferralCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  return /^[A-Z0-9]{6,12}$/.test(code) ? code : null;
}

/** A fresh 8-character invite code (no 0/O/1/I, so it reads aloud cleanly). */
export function newReferralCode(): string {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export type SignupResult = { signup: number; referrerId: string | null };

/**
 * Call once, when a brand-new account is created on first Google sign-in.
 * Gives the welcome bonus and, if the person arrived through an invite link,
 * links them to the inviter and gives the inviter the referral bonus.
 *
 * Abuse guards: only new accounts can be referred (an existing account can't
 * attach a referrer later); nobody can refer themselves; the inviter must be
 * active; at most MAX_REFERRALS_PER_DAY bonuses per inviter per IST day; and
 * referral points stop counting if the new account is later suspended or
 * banned. Google sign-in already ties each account to one verified Google
 * address, and every point is held for 30 days before it can be redeemed.
 */
export async function awardSignup(tx: Tx, userId: string, referralCode: string | null, now = new Date()): Promise<SignupResult> {
  const signedUp = await give(tx, userId, null, "SIGNUP", `SIGNUP:${userId}`, now);
  const result: SignupResult = { signup: signedUp ? POINTS.SIGNUP : 0, referrerId: null };

  const code = normalizeReferralCode(referralCode);
  if (!code) return result;
  const [me, referrer] = await Promise.all([
    tx.user.findUnique({ where: { id: userId }, select: { referredById: true, primaryEmail: true } }),
    tx.user.findUnique({ where: { referralCode: code }, select: { id: true, status: true, primaryEmail: true } }),
  ]);
  if (!me || me.referredById || !referrer || referrer.id === userId || referrer.status !== "ACTIVE") return result;
  if (me.primaryEmail && referrer.primaryEmail && sameMailbox(me.primaryEmail, referrer.primaryEmail)) return result;

  await tx.user.update({ where: { id: userId }, data: { referredById: referrer.id } });
  const today = istDayStart(now);
  const todays = await tx.pointEvent.count({ where: { userId: referrer.id, kind: "REFERRAL", createdAt: { gte: today } } });
  if (todays >= MAX_REFERRALS_PER_DAY) return result;
  if (await give(tx, referrer.id, null, "REFERRAL", `REFERRAL:${userId}`, now, userId)) result.referrerId = referrer.id;
  return result;
}

/** Gmail ignores dots and "+tags", so a.b+x@gmail.com is the same inbox as ab@gmail.com. */
export function sameMailbox(a: string, b: string): boolean {
  const canon = (e: string) => {
    const [local, domain = ""] = e.toLowerCase().split("@");
    const d = domain === "googlemail.com" ? "gmail.com" : domain;
    const l = local.split("+")[0];
    return `${d === "gmail.com" ? l.replace(/\./g, "") : l}@${d}`;
  };
  return canon(a) === canon(b);
}

/**
 * The daily point for opening the app while signed in: one per IST calendar
 * day. Safe to call on every page load; repeat calls the same day do nothing.
 */
export async function claimDailyOpen(userId: string, now = new Date()): Promise<{ awarded: boolean; points: number; day: string }> {
  const day = istDayKey(now);
  const awarded = await prisma.$transaction((tx) => give(tx, userId, null, "DAILY_OPEN", `DAILY_OPEN:${userId}:${day}`, now));
  return { awarded, points: awarded ? POINTS.DAILY_OPEN : 0, day };
}

/** Whether this person already has today's (IST) daily point. */
export async function hasDailyOpen(userId: string, now = new Date()): Promise<boolean> {
  const hit = await prisma.pointEvent.findUnique({ where: { dedupeKey: `DAILY_OPEN:${userId}:${istDayKey(now)}` }, select: { id: true } });
  return !!hit;
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
  const dayStart = istDayStart(review.createdAt);
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

/**
 * Points that still count: review points while their review is approved,
 * referral points while the person who joined is active, and sign-up and
 * daily points always.
 */
export const LIVE_POINTS: Prisma.PointEventWhereInput = {
  OR: [
    { reviewId: { not: null }, review: { is: { status: "APPROVED" } } },
    { kind: "REFERRAL", sourceUser: { is: { status: "ACTIVE" } } },
    { kind: { in: ["SIGNUP", "DAILY_OPEN"] } },
  ],
};
const liveEvents = (userId: string): Prisma.PointEventWhereInput => ({ userId, ...LIVE_POINTS });

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
    const dayEnd = new Date(istDayStart(nextUnlock.availableAt).getTime() + DAY_MS);
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
    /** The reviewed business, for review points; null for account points. */
    business: { id: string; name: string } | null;
  }[];
  /** People who joined with this user's invite link. */
  referrals: number;
}

export async function rewardsSummary(userId: string, now = new Date()): Promise<RewardsSummary> {
  const [balance, history, referrals] = await Promise.all([
    pointsBalance(userId, now),
    prisma.pointEvent.findMany({
      where: liveEvents(userId),
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { review: { select: { property: { select: { id: true, name: true } } } } },
    }),
    prisma.user.count({ where: { referredById: userId } }),
  ]);
  return {
    ...balance,
    history: history.map((e) => ({
      id: e.id,
      kind: e.kind,
      points: e.points,
      createdAt: e.createdAt,
      availableAt: e.availableAt,
      business: e.review?.property ?? null,
    })),
    referrals,
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
