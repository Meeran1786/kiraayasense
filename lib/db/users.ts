import "server-only";
import { prisma } from "@/lib/prisma";
import { baseHandle, reviewerBadges, reviewerLevel, type Badge, type ReviewerLevel } from "@/lib/handles";
import { reviewRewardInfo, totalPoints } from "@/lib/rewards";
import type { RelationshipKey } from "@/lib/relationships";
import type { ReviewStatus } from "@prisma/client";

/** Returns `base`, or `base-2`, `base-3`… whichever is free. */
export async function uniqueHandle(source: string): Promise<string> {
  const base = baseHandle(source);
  const taken = new Set(
    (await prisma.user.findMany({ where: { handle: { startsWith: base } }, select: { handle: true } })).map(
      (u) => u.handle
    )
  );
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base.slice(0, 26)}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

export interface ProfileReview {
  id: string;
  status: ReviewStatus;
  relationship: RelationshipKey;
  isAnonymous: boolean;
  createdAt: Date;
  overall: number | null;
  firstReason: string | null;
  business: { id: string; name: string; locality: string; category: string };
  proofVerified: boolean;
  /** Earned reward points (verified review). Shown as a disclosure label. */
  rewarded: boolean;
  helpfulCount: number;
}

export interface ReviewerProfile {
  id: string;
  displayName: string;
  handle: string;
  city: string | null;
  bio: string | null;
  avatarUrl: string | null;
  profileVisibility: "PUBLIC" | "PRIVATE";
  memberSince: Date;
  level: ReviewerLevel;
  approvedReviewCount: number;
  verifiedReviewCount: number;
  points: number;
  badges: Badge[];
  reviews: ProfileReview[];
}

// Avatars are Google profile photo URLs for now; uploaded avatars come later.
const avatarUrl = (key: string | null) => (key && /^https:\/\//.test(key) ? key : null);

async function loadProfile(where: { id: string } | { handle: string }, ownView: boolean): Promise<ReviewerProfile | null> {
  const user = await prisma.user.findUnique({
    where,
    include: {
      reviews: {
        // Visitors see only approved reviews posted under the reviewer's name.
        where: ownView ? undefined : { status: "APPROVED", isAnonymous: false },
        orderBy: { createdAt: "desc" },
        include: {
          property: { include: { locality: true, category: true } },
          answers: { where: { starValue: { not: null } }, select: { starValue: true } },
          reasons: { select: { text: true }, take: 1 },
          proofs: { select: { status: true } },
        },
      },
    },
  });
  if (!user || user.status !== "ACTIVE" || !user.handle) return null;
  if (!ownView && user.profileVisibility !== "PUBLIC") return null;

  const reviews: ProfileReview[] = user.reviews.map((r) => {
    const stars = r.answers.map((a) => a.starValue!);
    return {
      id: r.id,
      status: r.status,
      relationship: r.relationship as RelationshipKey,
      isAnonymous: r.isAnonymous,
      createdAt: r.createdAt,
      overall: stars.length ? Math.round((stars.reduce((a, b) => a + b, 0) / stars.length) * 10) / 10 : null,
      firstReason: r.reasons[0]?.text ?? null,
      business: {
        id: r.property.id,
        name: r.property.name,
        locality: r.property.locality.name,
        category: r.property.category.name,
      },
      proofVerified: r.proofs.some((p) => p.status === "APPROVED"),
      rewarded: false,
      helpfulCount: 0,
    };
  });
  const info = await reviewRewardInfo(reviews.map((r) => r.id));
  for (const r of reviews) {
    r.rewarded = info.rewarded.has(r.id);
    r.helpfulCount = info.helpful.get(r.id) ?? 0;
  }

  // Level counts every approved review, anonymous ones included, so posting
  // anonymously never costs a reviewer standing.
  const approved = await prisma.review
    .findMany({
      where: { userId: user.id, status: "APPROVED" },
      select: { proofs: { select: { status: true } }, property: { select: { district: true } } },
    })
    .then((rows) =>
      rows.map((r) => ({ proofVerified: r.proofs.some((p) => p.status === "APPROVED"), city: r.property.district }))
    );
  const verified = approved.filter((r) => r.proofVerified);
  const byCity = new Map<string, number>();
  for (const r of verified) if (r.city) byCity.set(r.city, (byCity.get(r.city) ?? 0) + 1);

  return {
    id: user.id,
    displayName: user.displayName,
    handle: user.handle,
    city: user.city,
    bio: user.bio,
    avatarUrl: avatarUrl(user.avatarStorageKey),
    profileVisibility: user.profileVisibility,
    memberSince: user.createdAt,
    level: reviewerLevel(approved.length),
    approvedReviewCount: approved.length,
    verifiedReviewCount: verified.length,
    points: await totalPoints(user.id),
    badges: reviewerBadges(verified.length, byCity),
    reviews,
  };
}

export const getPublicProfile = (handle: string) => loadProfile({ handle: handle.toLowerCase() }, false);
export const getOwnProfile = (userId: string) => loadProfile({ id: userId }, true);
