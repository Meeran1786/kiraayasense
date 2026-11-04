import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SEARCH_LIMIT, SEARCH_SORTS, searchProperties, type SearchSort } from "@/lib/db/properties";
import { locationOptions } from "@/lib/db/locations";
import { HOW_RATINGS_WORK, topRated } from "@/lib/geo";
import { SITE_URL } from "@/lib/site";
import { getCategoryTree } from "@/lib/db/categories";
import { PropertyCard } from "@/components/property/PropertyCard";
import { FilterSidebar } from "@/components/search/FilterSidebar";
import { Footer } from "@/components/layout/Footer";
import { brand } from "@/lib/brand";

interface SearchPageProps {
  searchParams: {
    q?: string;
    category?: string;
    minRating?: string;
    sort?: string;
    state?: string;
    city?: string;
    locality?: string;
    lat?: string;
    lng?: string;
    km?: string;
    verified?: string;
    reviewed?: string;
  };
}

type Params = SearchPageProps["searchParams"];

function parseNear(p: Params) {
  const lat = Number(p.lat);
  const lng = Number(p.lng);
  const km = Math.min(Math.max(Number(p.km) || 5, 1), 50);
  if (!p.lat || !p.lng || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  return { lat, lng, km };
}

/** "PG in Indiranagar, Bengaluru Urban" style heading from the active filters. */
async function describe(p: Params, localityName?: string) {
  const tree = await getCategoryTree();
  const category = p.category ? tree.flatMap((t) => [t, ...t.children]).find((c) => c.slug === p.category) : undefined;
  const near = parseNear(p);
  const area = [localityName, p.city, p.city ? undefined : p.state].filter(Boolean).join(", ");
  // Includes its preposition: "in Indiranagar, Bengaluru Urban" or "within 5 km of you".
  const place = near ? `within ${near.km} km of you` : area ? `in ${area}` : "";
  return { category, place };
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const { category, place } = await describe(searchParams);
  // Category and city pages are worth indexing; free-text, rating, locality
  // and near-me searches are not.
  const indexable =
    !searchParams.q && !searchParams.minRating && !searchParams.sort && !searchParams.locality && !searchParams.lat &&
    !searchParams.verified && !searchParams.reviewed;
  const where = ` ${place || "in India"}`;
  const title = category
    ? `${category.name}${where} — reviews and ratings | KiraayaSense`
    : searchParams.q
      ? `"${searchParams.q}" — search | KiraayaSense`
      : place
        ? `Businesses${where} — reviews | KiraayaSense`
        : "Browse businesses | KiraayaSense";
  const canonical = new URLSearchParams();
  if (category) canonical.set("category", category.slug);
  if (searchParams.state) canonical.set("state", searchParams.state);
  if (searchParams.city) canonical.set("city", searchParams.city);
  return {
    title,
    description: category
      ? `Compare ${category.name}${where} on honest, proof-backed reviews from real customers, tenants and employees.`
      : undefined,
    alternates: { canonical: canonical.size ? `/search?${canonical.toString()}` : "/search" },
    robots: indexable ? undefined : { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const near = parseNear(searchParams);
  const sortParam = SEARCH_SORTS.includes(searchParams.sort as SearchSort) ? (searchParams.sort as SearchSort) : undefined;
  const [categories, locations, results] = await Promise.all([
    getCategoryTree(),
    locationOptions(searchParams.state, searchParams.city),
    searchProperties({
      q: searchParams.q,
      category: searchParams.category,
      minRating: searchParams.minRating ? Number(searchParams.minRating) : undefined,
      sort: sortParam ?? (near ? "nearest" : "rating_desc"),
      state: searchParams.state,
      city: searchParams.city,
      locality: searchParams.locality,
      near,
      verifiedOnly: searchParams.verified === "1",
      reviewedOnly: searchParams.reviewed === "1",
    }),
  ]);
  const localityName = locations.localities.find((l) => l.value === searchParams.locality)?.label;
  const { category, place } = await describe(searchParams, localityName);
  const heading = searchParams.q
    ? `Results for "${searchParams.q}"${place ? ` ${place}` : ""}`
    : `${category ? category.name : "All businesses"}${place ? ` ${place}` : ""}`;

  // Answer-shaped Q&A for category and place pages (GEO): AI answer engines
  // quote these, and FAQPage markup tells them what each answer is for.
  const subject = `${category ? category.name.toLowerCase() : "businesses"} ${place}`.trim();
  const best = topRated(results);
  const faq =
    !searchParams.q && (category || place) && results.length > 0
      ? [
          {
            q: `Which ${subject} have the best reviews?`,
            a: best.length
              ? `On KiraayaSense the best rated are ${best
                  .map((p) => `${p.name} (${p.overallRating.toFixed(1)}/5 from ${p.approvedReviewCount} review${p.approvedReviewCount === 1 ? "" : "s"})`)
                  .join(", ")}.`
              : `None of the ${subject} listed on KiraayaSense have reviews yet. Be the first to write one.`,
          },
          {
            q: `How many ${subject} are listed on KiraayaSense?`,
            a:
              results.length >= SEARCH_LIMIT
                ? `More than ${SEARCH_LIMIT}. Filter by locality to see them all.`
                : `${results.length}, of which ${results.filter((p) => p.approvedReviewCount > 0).length} have reviews and ${results.filter((p) => p.verifiedProofCount > 0).length} have verified reviews.`,
          },
          { q: "How are KiraayaSense ratings calculated?", a: HOW_RATINGS_WORK },
        ]
      : [];

  return (
    <main style={{ background: brand.navy, minHeight: "100vh" }}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-xl font-bold text-[var(--ks-text)]">
          {heading}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--ks-text-muted)" }}>
          {results.length >= SEARCH_LIMIT ? `Top ${SEARCH_LIMIT}` : results.length} business{results.length === 1 ? "" : "es"}
          {results.length >= SEARCH_LIMIT ? " shown. Narrow down by locality or category to see more." : " found"}
        </p>

        <div className="mt-6 flex flex-col gap-6 sm:flex-row">
          <Suspense fallback={null}>
            <FilterSidebar categories={categories} locations={locations} />
          </Suspense>

          <div className="flex-1">
            {results.length === 0 ? (
              <div
                className="rounded-xl border p-8 text-center text-sm"
                style={{ borderColor: "var(--ks-border)", color: "var(--ks-text-faint)" }}
              >
                No businesses matched your search. Try a different name or locality, or clear a filter.
                <p className="mt-3">
                  <Link
                    href={`/business/new${searchParams.q ? `?name=${encodeURIComponent(searchParams.q)}` : ""}`}
                    className="font-semibold text-[var(--ks-text)] underline"
                  >
                    Can&apos;t find it? Add the business
                  </Link>
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))}
              </div>
            )}
            {faq.length > 0 && (
              <section className="mt-10 rounded-xl border p-5" style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}>
                <h2 className="text-sm font-semibold text-[var(--ks-text)]">Quick answers</h2>
                <dl className="mt-3 flex flex-col gap-4">
                  {faq.map((f) => (
                    <div key={f.q}>
                      <dt className="text-sm font-medium text-[var(--ks-text)]">{f.q}</dt>
                      <dd className="mt-1 text-sm text-[var(--ks-text-muted)]">{f.a}</dd>
                    </div>
                  ))}
                </dl>
                <script
                  type="application/ld+json"
                  // "<" is escaped so a business name can't close the script tag.
                  dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                      "@context": "https://schema.org",
                      "@type": "FAQPage",
                      url: SITE_URL + "/search",
                      mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
                    }).replace(/</g, "\\u003c"),
                  }}
                />
              </section>
            )}
            {results.length > 0 && (
              <p className="mt-6 text-center text-xs text-[var(--ks-text-faint)]">
                Not here?{" "}
                <Link href="/business/new" className="underline">
                  Add a business
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
