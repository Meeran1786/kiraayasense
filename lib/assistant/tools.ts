import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getPropertyById, searchProperties, type DbProperty, type SearchSort } from "@/lib/db/properties";

/**
 * The assistant's tools. Both only read approved, public data (the same
 * listings and reviews anyone can see on the site); neither can write.
 */

export const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "search_businesses",
    description:
      "Search KiraayaSense listings (PGs, hostels, flats, hotels, employers, hospitals, colleges, shops and other businesses in India). " +
      "Returns up to 8 matches with rating, review count and rent range. Use it before recommending or comparing anything. " +
      "Put a business name or locality in `query`; put the city in `city`; use a category slug from the system prompt in `category`.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Business name, locality, area or PIN code, e.g. 'Madhapur' or 'Zolo'. Leave out to list a whole city or category." },
        city: { type: "string", description: "City or district name in English, e.g. 'Hyderabad', 'Bengaluru'." },
        category: { type: "string", description: "Category or sub-category slug from the list in the system prompt." },
        min_rating: { type: "number", description: "Only listings rated at least this (1 to 5)." },
        max_rent: { type: "number", description: "Only housing whose lowest monthly rent (INR) is at most this." },
        reviewed_only: { type: "boolean", description: "Only listings with at least one review. Use this when the user wants recommendations." },
        sort: { type: "string", enum: ["rating_desc", "review_count_desc", "newest"], description: "Default rating_desc." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_business",
    description:
      "Full details of one listing by its id (from search_businesses): ratings per question, rent, address, owner replies, and the text of up to 15 most recent reviews.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string", description: "The listing id." } },
      required: ["id"],
      additionalProperties: false,
    },
  },
];

const searchInput = z.object({
  query: z.string().max(120).optional(),
  city: z.string().max(80).optional(),
  category: z.string().max(80).optional(),
  min_rating: z.number().min(0).max(5).optional(),
  max_rent: z.number().min(0).optional(),
  reviewed_only: z.boolean().optional(),
  sort: z.enum(["rating_desc", "review_count_desc", "newest"]).optional(),
});
const getInput = z.object({ id: z.string().max(64) });

const round1 = (n: number) => Math.round(n * 10) / 10;

function rent(p: DbProperty) {
  if (p.approxRentMin == null && p.approxRentMax == null) return undefined;
  return { min_inr: p.approxRentMin ?? undefined, max_inr: p.approxRentMax ?? undefined };
}

function summary(p: DbProperty) {
  return {
    id: p.id,
    url: `/property/${p.id}`,
    name: p.name,
    category: p.parentCategoryName ? `${p.parentCategoryName} › ${p.categoryName}` : p.categoryName,
    locality: p.locality,
    city: p.district,
    state: p.state,
    rating: p.approvedReviewCount > 0 ? round1(p.overallRating) : null,
    reviews: p.approvedReviewCount,
    reviews_with_verified_proof: p.verifiedProofCount,
    owner_verified: p.ownerVerified,
    rent: rent(p),
  };
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

function details(p: DbProperty) {
  return {
    ...summary(p),
    address: p.address ?? undefined,
    pincode: p.pincode || undefined,
    ratings_by_question: p.metrics.map((m) => ({ question: m.label, average: round1(m.average), answers: m.count })),
    recent_reviews: p.reviews.slice(0, 15).map((r) => ({
      posted: r.postedOn,
      reviewer_relationship: r.relationship,
      overall: r.overall,
      proof_verified: r.proofVerified,
      helpful_votes: r.helpfulCount,
      pros: r.reasons.filter((x) => x.type === "PRO").map((x) => clip(`${x.label}: ${x.text}`, 400)),
      cons: r.reasons.filter((x) => x.type === "CON").map((x) => clip(`${x.label}: ${x.text}`, 400)),
      facts: r.facts.map((f) => `${f.label}: ${f.value}`),
      owner_reply: r.ownerResponse ? clip(r.ownerResponse, 300) : undefined,
    })),
  };
}

/** "hyderabad" → "Hyderabad" as stored, so the exact-match city filter finds it. */
async function resolveCity(city: string) {
  const exact = await prisma.property.findFirst({
    where: { status: "APPROVED", district: { equals: city, mode: "insensitive" } },
    select: { district: true },
  });
  if (exact) return exact.district;
  const loose = await prisma.property.findFirst({
    where: { status: "APPROVED", district: { contains: city, mode: "insensitive" } },
    select: { district: true },
  });
  return loose?.district ?? null;
}

async function searchBusinesses(raw: unknown) {
  const input = searchInput.parse(raw);
  let city: string | undefined;
  if (input.city) {
    const resolved = await resolveCity(input.city.trim());
    if (!resolved) return { results: [], note: `No listings found in a city called "${input.city}".` };
    city = resolved;
  }
  let results = await searchProperties({
    q: input.query?.trim() || undefined,
    city,
    category: input.category?.trim() || undefined,
    minRating: input.min_rating,
    reviewedOnly: input.reviewed_only,
    sort: (input.sort ?? "rating_desc") as SearchSort,
  });
  if (input.max_rent != null) {
    results = results.filter((p) => p.approxRentMin != null && p.approxRentMin <= input.max_rent!);
  }
  return { total_shown: Math.min(results.length, 8), results: results.slice(0, 8).map(summary) };
}

async function getBusiness(raw: unknown) {
  const { id } = getInput.parse(raw);
  const p = await getPropertyById(id);
  return p ? details(p) : { error: "No listing with that id." };
}

/** Runs one tool call. Errors come back as text so the model can recover. */
export async function runTool(name: string, input: unknown): Promise<{ content: string; isError: boolean }> {
  try {
    const result = name === "search_businesses" ? await searchBusinesses(input) : name === "get_business" ? await getBusiness(input) : null;
    if (result === null) return { content: `Unknown tool ${name}`, isError: true };
    return { content: JSON.stringify(result), isError: false };
  } catch (err) {
    if (err instanceof z.ZodError) return { content: `Invalid input: ${err.issues.map((i) => i.message).join("; ")}`, isError: true };
    console.error("[assistant] tool", name, err);
    return { content: "The search failed. Try again with different terms.", isError: true };
  }
}
