import "server-only";
import { prisma } from "@/lib/prisma";
import { categoryIdsForSlug } from "@/lib/db/categories";
import type { RelationshipKey } from "@/lib/relationships";
import type { Prisma } from "@prisma/client";

/**
 * Read side for business ("property") pages, cards and search. Ratings are
 * computed per question key across every approved review, whatever question
 * set version each review answered.
 */

export interface DbReviewReason {
  type: "PRO" | "CON";
  questionKey: string;
  label: string;
  text: string;
}

export interface DbReview {
  id: string;
  reviewerInitial: string;
  /** Set when the reviewer posted under their name and keeps a public profile. */
  reviewer: { name: string; handle: string } | null;
  relationship: RelationshipKey;
  postedAgo: string;
  reasons: DbReviewReason[];
  facts: { label: string; value: string }[];
  mediaCount: number;
  proofVerified: boolean;
  ownerResponse?: string;
}

export interface DbMetric {
  key: string;
  label: string;
  average: number;
  count: number;
}

export interface DbProperty {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  parentCategoryName: string | null;
  isHousing: boolean;
  locality: string;
  district: string;
  state: string;
  pincode: string;
  approxRentMin: number | null;
  approxRentMax: number | null;
  overallRating: number;
  approvedReviewCount: number;
  verifiedProofCount: number;
  metrics: DbMetric[];
  heroTone: string;
  reviews: DbReview[];
}

const propertyInclude = {
  locality: true,
  category: { include: { parent: true } },
  reviews: {
    where: { status: "APPROVED" as const },
    include: {
      answers: { include: { question: true } },
      reasons: true,
      media: true,
      proofs: true,
      ownerResponse: true,
      user: true,
      questionSet: { include: { questions: true } },
    },
    orderBy: { createdAt: "desc" as const },
  },
} satisfies Prisma.PropertyInclude;

type PropertyWithRelations = Prisma.PropertyGetPayload<{ include: typeof propertyInclude }>;

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

// Deterministic tint for the placeholder tile (no real photo pipeline yet —
// see components/property/PropertyThumb.tsx).
function heroToneFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `oklch(60% 0.15 ${hue})`;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function formatFact(answer: PropertyWithRelations["reviews"][number]["answers"][number]): string | null {
  if (answer.boolValue !== null) return answer.boolValue ? "Yes" : "No";
  if (answer.choiceValue !== null) return answer.choiceValue;
  if (answer.numberValue !== null) return answer.numberValue.toLocaleString("en-IN");
  return null;
}

function hydrateProperty(p: PropertyWithRelations): DbProperty {
  const totals = new Map<string, { label: string; order: number; sum: number; count: number }>();

  const reviews: DbReview[] = p.reviews.map((review) => {
    const labels = new Map(review.questionSet.questions.map((q) => [q.key, q.label]));
    const facts: DbReview["facts"] = [];

    for (const answer of review.answers) {
      if (answer.starValue !== null) {
        const entry = totals.get(answer.questionKey) ?? {
          label: answer.question.label,
          order: answer.question.sortOrder,
          sum: 0,
          count: 0,
        };
        entry.sum += answer.starValue;
        entry.count += 1;
        totals.set(answer.questionKey, entry);
        continue;
      }
      const value = formatFact(answer);
      // Rent is shown only as the business's range, never per review.
      if (value !== null && answer.questionKey !== "MONTHLY_RENT") facts.push({ label: answer.question.label, value });
    }

    return {
      id: review.id,
      reviewerInitial: review.isAnonymous ? "?" : (review.user.displayName?.trim().charAt(0) || "?").toUpperCase(),
      reviewer:
        !review.isAnonymous && review.user.profileVisibility === "PUBLIC" && review.user.handle
          ? { name: review.user.displayName, handle: review.user.handle }
          : null,
      relationship: review.relationship as RelationshipKey,
      postedAgo: timeAgo(review.createdAt),
      reasons: review.reasons.map((r) => ({
        type: r.type as "PRO" | "CON",
        questionKey: r.questionKey,
        label: labels.get(r.questionKey) ?? r.questionKey,
        text: r.text,
      })),
      facts,
      mediaCount: review.media.length,
      proofVerified: review.proofs.some((proof) => proof.status === "APPROVED"),
      ownerResponse: review.ownerResponse?.status === "APPROVED" ? review.ownerResponse.text : undefined,
    };
  });

  const metrics: DbMetric[] = Array.from(totals.entries())
    .map(([key, t]) => ({ key, label: t.label, order: t.order, average: round1(t.sum / t.count), count: t.count }))
    .sort((a, b) => b.count - a.count || a.order - b.order);

  const overallRating =
    metrics.length > 0 ? round1(metrics.reduce((a, m) => a + m.average, 0) / metrics.length) : 0;

  return {
    id: p.id,
    name: p.name,
    categoryId: p.categoryId,
    categoryName: p.category.name,
    parentCategoryName: p.category.parent?.name ?? null,
    isHousing: (p.category.parent ?? p.category).slug === "housing",
    locality: p.locality.name,
    district: p.district,
    state: p.state,
    pincode: p.pincode,
    approxRentMin: p.approxRentMin,
    approxRentMax: p.approxRentMax,
    overallRating,
    approvedReviewCount: reviews.length,
    verifiedProofCount: reviews.filter((r) => r.proofVerified).length,
    metrics,
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
    .filter((p) => p.approvedReviewCount > 0)
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
  category?: string; // category or sub-category slug
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
      { category: { name: { contains: q, mode: "insensitive" } } },
    ];
  }
  if (filters.category) {
    where.categoryId = { in: await categoryIdsForSlug(filters.category) };
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
