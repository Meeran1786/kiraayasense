import "server-only";
import { prisma } from "@/lib/prisma";
import { GRIEVANCE_CATEGORIES, type GrievanceCategoryKey } from "@/lib/reviewValidation";
import type { PropertyCategory } from "@/lib/constants";
import type { Prisma } from "@prisma/client";

/**
 * Real-database replacement for the old lib/mockData.ts. Function names and
 * return shapes deliberately mirror the mock so the page/component call
 * sites barely changed (see git history) — only the import path and an
 * `await` were added. Backed by Prisma against the Postgres schema in
 * prisma/schema.prisma.
 */

export interface DbReview {
  id: string;
  reviewerInitial: string;
  postedAgo: string;
  categoryScores: Record<GrievanceCategoryKey, number>;
  reasons: { type: "PRO" | "CON"; category: GrievanceCategoryKey; text: string }[];
  mediaCount: number;
  proofVerified: boolean;
  ownerResponse?: string;
}
// Kept as an alias so components that still import the old type name
// (components/property/ReviewList.tsx) don't need to change.
export type MockReview = DbReview;

export interface DbProperty {
  id: string;
  name: string;
  category: PropertyCategory;
  locality: string;
  district: string;
  state: string;
  pincode: string;
  approxRentMin: number;
  approxRentMax: number;
  overallRating: number;
  approvedReviewCount: number;
  verifiedProofCount: number;
  categoryAverages: Record<GrievanceCategoryKey, number>;
  heroTone: string;
  reviews: DbReview[];
}
export type MockProperty = DbProperty;

const propertyInclude = {
  locality: true,
  reviews: {
    where: { status: "APPROVED" as const },
    include: {
      categoryScores: true,
      reasons: true,
      media: true,
      proofs: true,
      ownerResponse: true,
      user: true,
    },
    orderBy: { createdAt: "desc" as const },
  },
} satisfies Prisma.PropertyInclude;

type PropertyWithRelations = Prisma.PropertyGetPayload<{ include: typeof propertyInclude }>;

function emptyCategoryAverages(): Record<GrievanceCategoryKey, number> {
  return Object.fromEntries(GRIEVANCE_CATEGORIES.map((c) => [c.key, 0])) as Record<GrievanceCategoryKey, number>;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const units: [number, string][] = [
    [31536000, "year"],
    [2592000, "month"],
    [604800, "week"],
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
  ];
  for (const [secs, label] of units) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count} ${label}${count > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

// Deterministic tint for the placeholder property tile (no real photo
// pipeline yet — see components/property/PropertyThumb.tsx).
function heroToneFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `oklch(60% 0.15 ${hue})`;
}

function hydrateProperty(p: PropertyWithRelations): DbProperty {
  const categoryTotals = emptyCategoryAverages();
  const categoryCounts = emptyCategoryAverages();

  const reviews: DbReview[] = p.reviews.map((review) => {
    for (const cs of review.categoryScores) {
      const key = cs.category as GrievanceCategoryKey;
      categoryTotals[key] += cs.score;
      categoryCounts[key] += 1;
    }
    return {
      id: review.id,
      reviewerInitial: (review.user.displayName?.trim().charAt(0) || "?").toUpperCase(),
      postedAgo: timeAgo(review.createdAt),
      categoryScores: Object.fromEntries(
        review.categoryScores.map((cs) => [cs.category, cs.score])
      ) as Record<GrievanceCategoryKey, number>,
      reasons: review.reasons.map((r) => ({
        type: r.type as "PRO" | "CON",
        category: r.category as GrievanceCategoryKey,
        text: r.text,
      })),
      mediaCount: review.media.length,
      proofVerified: review.proofs.some((proof) => proof.status === "APPROVED"),
      ownerResponse: review.ownerResponse?.status === "APPROVED" ? review.ownerResponse.text : undefined,
    };
  });

  const categoryAverages = Object.fromEntries(
    GRIEVANCE_CATEGORIES.map((c) => {
      const count = categoryCounts[c.key];
      return [c.key, count > 0 ? Math.round((categoryTotals[c.key] / count) * 10) / 10 : 0];
    })
  ) as Record<GrievanceCategoryKey, number>;

  const definedAverages = GRIEVANCE_CATEGORIES.map((c) => categoryAverages[c.key]).filter((v) => v > 0);
  const overallRating =
    definedAverages.length > 0
      ? Math.round((definedAverages.reduce((a, b) => a + b, 0) / definedAverages.length) * 10) / 10
      : 0;

  return {
    id: p.id,
    name: p.name,
    category: p.category as PropertyCategory,
    locality: p.locality.name,
    district: p.district,
    state: p.state,
    pincode: p.pincode,
    approxRentMin: p.approxRentMin ?? 0,
    approxRentMax: p.approxRentMax ?? 0,
    overallRating,
    approvedReviewCount: reviews.length,
    verifiedProofCount: reviews.filter((r) => r.proofVerified).length,
    categoryAverages,
    heroTone: heroToneFor(p.name),
    reviews,
  };
}

export async function getFeaturedProperties(limit = 6): Promise<DbProperty[]> {
  const properties = await prisma.property.findMany({
    where: { status: "APPROVED" },
    include: propertyInclude,
  });
  return properties
    .map(hydrateProperty)
    .sort((a, b) => b.overallRating - a.overallRating)
    .slice(0, limit);
}

export async function getPropertyById(id: string): Promise<DbProperty | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const property = await prisma.property.findFirst({
    where: { id, status: "APPROVED" },
    include: propertyInclude,
  });
  return property ? hydrateProperty(property) : null;
}

export interface SearchFilters {
  q?: string;
  category?: PropertyCategory;
  minRating?: number;
  sort?: "rating_desc" | "review_count_desc" | "newest";
}

export async function searchProperties(filters: SearchFilters): Promise<DbProperty[]> {
  const where: Prisma.PropertyWhereInput = { status: "APPROVED" };

  if (filters.q) {
    const q = filters.q;
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { district: { contains: q, mode: "insensitive" } },
      { state: { contains: q, mode: "insensitive" } },
      { pincode: { contains: q } },
      { locality: { name: { contains: q, mode: "insensitive" } } },
    ];
  }
  if (filters.category) {
    where.category = filters.category;
  }

  const properties = await prisma.property.findMany({
    where,
    include: propertyInclude,
    orderBy: filters.sort === "newest" ? { createdAt: "desc" } : undefined,
  });

  let results = properties.map(hydrateProperty);

  if (filters.minRating) {
    results = results.filter((p) => p.overallRating >= filters.minRating!);
  }

  switch (filters.sort) {
    case "review_count_desc":
      results.sort((a, b) => b.approvedReviewCount - a.approvedReviewCount);
      break;
    case "newest":
      break; // already ordered by createdAt desc from the query
    case "rating_desc":
    default:
      results.sort((a, b) => b.overallRating - a.overallRating);
  }

  return results;
}

export async function getPopularLocalities(): Promise<{ name: string; district: string; propertyCount: number }[]> {
  const localities = await prisma.locality.findMany({
    include: { _count: { select: { properties: { where: { status: "APPROVED" } } } } },
  });
  return localities
    .map((l) => ({ name: l.name, district: l.district, propertyCount: l._count.properties }))
    .filter((l) => l.propertyCount > 0)
    .sort((a, b) => b.propertyCount - a.propertyCount)
    .slice(0, 6);
}
