import "server-only";
import { prisma } from "@/lib/prisma";
import { categoryIdsForSlug } from "@/lib/db/categories";
import { nearbyPropertyIds } from "@/lib/db/locations";
import type { RelationshipKey } from "@/lib/relationships";
import type { Prisma } from "@prisma/client";

export type DataSourceKey = "USER" | "ADMIN" | "OSM" | "OVERTURE" | "MCA";

/**
 * Read side for business ("property") pages, cards and search. Ratings are
 * computed per question key across every approved review, whatever question
 * set version each review answered.
 */

export interface DbReviewReason {
  id: string;
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
  /** Approved photos attached to this review. */
  photoUrls: string[];
  proofVerified: boolean;
  /** This review earned reward points; shown as a disclosure label. */
  rewarded: boolean;
  helpfulCount: number;
  overall: number | null;
  postedOn: string;
  postedAt: string; // ISO date, for structured data
  createdAt: string; // full ISO timestamp, for "3 days ago" in the reader's language
  ownerResponse?: string;
  /** The same reviewer's earlier visits to this business, newest first. */
  earlierVisits: DbReview[];
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
  address: string | null;
  website: string | null;
  source: DataSourceKey;
  ownerVerified: boolean;
  approxRentMin: number | null;
  approxRentMax: number | null;
  overallRating: number;
  approvedReviewCount: number;
  verifiedProofCount: number;
  metrics: DbMetric[];
  heroTone: string;
  /** Approved review photos, newest first (at most 12). The first is the cover. */
  photos: string[];
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
      pointEvents: { where: { kind: "VERIFIED_REVIEW" as const }, select: { id: true } },
      _count: { select: { helpfulVotes: true } },
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

/** Public URL for an uploaded review photo (served by nginx from public/uploads). */
function mediaUrl(storageKey: string): string | null {
  if (/^https:\/\//.test(storageKey)) return storageKey;
  if (/^reviews\/[\w.-]+$/.test(storageKey)) return `/uploads/${storageKey}`;
  return null;
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

  // Reviews come newest first. A reviewer's first one here is their latest
  // visit: only that one counts toward the rating; older visits are shown
  // under it as history.
  const latestSeen = new Set<string>();
  const all = p.reviews.map((review) => {
    const isLatest = !latestSeen.has(review.userId);
    latestSeen.add(review.userId);
    const stars: number[] = [];
    const labels = new Map(review.questionSet.questions.map((q) => [q.key, q.label]));
    const facts: DbReview["facts"] = [];

    for (const answer of review.answers) {
      if (answer.starValue !== null) {
        stars.push(answer.starValue);
        if (!isLatest) continue;
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
        id: r.id,
        type: r.type as "PRO" | "CON",
        questionKey: r.questionKey,
        label: labels.get(r.questionKey) ?? r.questionKey,
        text: r.text,
      })),
      facts,
      mediaCount: review.media.length,
      photoUrls: review.media.filter((m) => m.kind === "PHOTO" && m.status === "APPROVED").map((m) => mediaUrl(m.storageKey)).filter((u): u is string => !!u),
      proofVerified: review.proofs.some((proof) => proof.status === "APPROVED"),
      rewarded: review.pointEvents.length > 0,
      helpfulCount: review._count.helpfulVotes,
      overall: stars.length ? round1(stars.reduce((a, b) => a + b, 0) / stars.length) : null,
      postedOn: review.createdAt.toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
      postedAt: review.createdAt.toISOString().slice(0, 10),
      createdAt: review.createdAt.toISOString(),
      ownerResponse: review.ownerResponse?.status === "APPROVED" ? review.ownerResponse.text : undefined,
      earlierVisits: [],
      groupKey: `${review.userId}:${review.isAnonymous}`,
    };
  });

  // Group visits under the reviewer's newest review. Named and anonymous
  // reviews are never grouped together, so anonymity holds.
  const reviews: DbReview[] = [];
  const heads = new Map<string, DbReview>();
  for (const { groupKey, ...review } of all) {
    const head = heads.get(groupKey);
    if (head) head.earlierVisits.push(review);
    else {
      heads.set(groupKey, review);
      reviews.push(review);
    }
  }
  const raters = latestSeen.size;
  const verifiedRaters = new Set(p.reviews.filter((r) => r.proofs.some((x) => x.status === "APPROVED")).map((r) => r.userId)).size;

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
    address: [p.doorNumber, p.street].filter(Boolean).join(", ") || null,
    website: p.website,
    source: p.source as DataSourceKey,
    ownerVerified: p.claimStatus === "VERIFIED",
    approxRentMin: p.approxRentMin,
    approxRentMax: p.approxRentMax,
    overallRating,
    approvedReviewCount: raters,
    verifiedProofCount: verifiedRaters,
    metrics,
    heroTone: heroToneFor(p.name),
    photos: all.flatMap((r) => r.photoUrls).slice(0, 12),
    reviews,
  };
}

export async function getFeaturedProperties(limit = 6): Promise<DbProperty[]> {
  const properties = await prisma.property.findMany({
    where: { status: "APPROVED", reviews: { some: { status: "APPROVED" } } },
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

export const SEARCH_LIMIT = 60;

export interface SearchFilters {
  q?: string;
  category?: string; // category or sub-category slug
  minRating?: number;
  sort?: SearchSort;
  state?: string;
  city?: string; // the listing's district
  locality?: string; // locality id
  near?: { lat: number; lng: number; km: number };
  /** Only listings with at least one review approved with proof. */
  verifiedOnly?: boolean;
  /** Only listings with at least one approved review. */
  reviewedOnly?: boolean;
}

export type SearchSort = "rating_desc" | "review_count_desc" | "newest" | "nearest";
export const SEARCH_SORTS: SearchSort[] = ["rating_desc", "review_count_desc", "newest", "nearest"];

/**
 * Published listings on a category / state / city page. Used to keep empty
 * pages out of search results, where Google reports them as soft 404s.
 */
export async function countListings(filters: Pick<SearchFilters, "category" | "state" | "city">): Promise<number> {
  const where: Prisma.PropertyWhereInput = { status: "APPROVED" };
  if (filters.category) where.categoryId = { in: await categoryIdsForSlug(filters.category) };
  if (filters.state) where.state = filters.state;
  if (filters.city) where.district = filters.city;
  return prisma.property.count({ where });
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
  if (filters.state) where.state = filters.state;
  if (filters.city) where.district = filters.city;
  if (filters.locality && /^[0-9a-f-]{36}$/i.test(filters.locality)) where.localityId = filters.locality;
  if (filters.verifiedOnly) {
    where.reviews = { some: { status: "APPROVED", proofs: { some: { status: "APPROVED" } } } };
  } else if (filters.reviewedOnly) {
    where.reviews = { some: { status: "APPROVED" } };
  }

  let nearOrder: Map<string, number> | null = null;
  if (filters.near) {
    const ids = await nearbyPropertyIds(filters.near.lat, filters.near.lng, filters.near.km);
    if (ids.length === 0) return [];
    nearOrder = new Map(ids.map((id, i) => [id, i]));
    where.id = { in: ids };
  }

  // Imported data puts tens of thousands of listings in a city, so only the
  // most-reviewed matches are loaded and ranked here.
  const properties = await prisma.property.findMany({
    where,
    include: propertyInclude,
    orderBy: filters.sort === "newest" ? { createdAt: "desc" } : [{ reviews: { _count: "desc" } }, { name: "asc" }],
    // "Nearest" ranks in memory by distance, so load every nearby match.
    take: nearOrder && filters.sort === "nearest" ? undefined : SEARCH_LIMIT,
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
    case "nearest":
      if (nearOrder) {
        results.sort((a, b) => nearOrder!.get(a.id)! - nearOrder!.get(b.id)!);
        results = results.slice(0, SEARCH_LIMIT);
      }
      break;
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
