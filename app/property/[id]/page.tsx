import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { MapPin, IndianRupee, Globe } from "lucide-react";
import { getPropertyById } from "@/lib/db/properties";
import { relationshipsForCategory } from "@/lib/db/categories";
import { PropertyThumb } from "@/components/property/PropertyThumb";
import { RatingBadge } from "@/components/property/RatingBadge";
import { CategoryBreakdown } from "@/components/property/CategoryBreakdown";
import { ReviewList } from "@/components/property/ReviewList";
import { WriteReviewGate } from "@/components/property/WriteReviewGate";
import { Footer } from "@/components/layout/Footer";
import { SourceCredit } from "@/components/property/SourceCredit";
import { brand } from "@/lib/brand";
import { SITE_URL } from "@/lib/site";

// Metadata and the page both need the listing; load it once per request.
const loadProperty = cache(getPropertyById);

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const p = await loadProperty(params.id);
  if (!p) return { title: "Business not found — KiraayaSense", robots: { index: false } };
  const place = [p.locality, p.district].filter(Boolean).join(", ");
  const title = `${p.name}, ${place} — ${p.categoryName} reviews | KiraayaSense`;
  const rating =
    p.approvedReviewCount > 0
      ? `Rated ${p.overallRating.toFixed(1)}/5 from ${p.approvedReviewCount} review${p.approvedReviewCount === 1 ? "" : "s"}. `
      : "";
  const description = `${rating}Honest reviews of ${p.name}, ${p.categoryName} in ${place}, ${p.state}. Read what customers, tenants and employees say, or write your own.`;
  return {
    title,
    description,
    alternates: { canonical: `/property/${p.id}` },
    openGraph: { title, description, url: `/property/${p.id}`, type: "website" },
  };
}

/** schema.org data so search results can show the business, its address and stars. */
function structuredData(p: NonNullable<Awaited<ReturnType<typeof getPropertyById>>>) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/property/${p.id}`,
    name: p.name,
    url: `${SITE_URL}/property/${p.id}`,
    ...(p.website ? { sameAs: [p.website] } : {}),
    address: {
      "@type": "PostalAddress",
      ...(p.address ? { streetAddress: p.address } : {}),
      addressLocality: p.locality,
      addressRegion: p.state,
      ...(p.pincode ? { postalCode: p.pincode } : {}),
      addressCountry: "IN",
    },
    ...(p.approvedReviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: p.overallRating.toFixed(1),
            reviewCount: p.approvedReviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
}

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  const property = await loadProperty(params.id);
  if (!property) notFound();
  const relationships = await relationshipsForCategory(property.categoryId);

  return (
    <main style={{ background: brand.navy, minHeight: "100vh" }}>
      <script
        type="application/ld+json"
        // "<" is escaped so a business name can't close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData(property)).replace(/</g, "\\u003c") }}
      />
      <PropertyThumb tone={property.heroTone} name={property.name} className="h-56 w-full sm:h-72" />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-[var(--ks-text)]">{property.name}</h1>
                <p className="mt-1 text-sm" style={{ color: "var(--ks-text-muted)" }}>
                  {property.parentCategoryName ? `${property.parentCategoryName} · ` : ""}
                  {property.categoryName}
                </p>
                <p className="mt-1 flex items-center gap-1 text-sm" style={{ color: "var(--ks-text-faint)" }}>
                  <MapPin size={14} className="shrink-0" />
                  {property.address ? `${property.address}, ` : ""}
                  {property.locality}, {property.district}, {property.state}
                  {property.pincode ? ` — ${property.pincode}` : ""}
                </p>
                {property.website && (
                  <p className="mt-1 flex items-center gap-1 text-sm" style={{ color: "var(--ks-text-faint)" }}>
                    <Globe size={13} className="shrink-0" />
                    <a href={property.website} target="_blank" rel="noopener noreferrer nofollow" className="truncate hover:underline">
                      {property.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                    </a>
                  </p>
                )}
                {property.isHousing && property.approxRentMin !== null && property.approxRentMax !== null && (
                  <p className="mt-1 flex items-center gap-1 text-sm" style={{ color: "var(--ks-text-faint)" }}>
                    <IndianRupee size={13} />
                    {property.approxRentMin.toLocaleString("en-IN")}–{property.approxRentMax.toLocaleString("en-IN")}
                    <span className="text-xs text-[var(--ks-text-faint)]">/month, self-reported by reviewers</span>
                  </p>
                )}
              </div>
              <RatingBadge rating={property.overallRating} size="lg" />
            </div>

            <hr className="my-6 border-0 border-t" style={{ borderColor: "var(--ks-border)" }} />

            <section>
              <h2 className="mb-3 text-sm font-semibold text-[var(--ks-text)]">
                Ratings <span className="font-normal text-[var(--ks-text-faint)]">({property.approvedReviewCount} review{property.approvedReviewCount === 1 ? "" : "s"}, {property.verifiedProofCount} with proof)</span>
              </h2>
              <CategoryBreakdown metrics={property.metrics} />
            </section>

            <hr className="my-6 border-0 border-t" style={{ borderColor: "var(--ks-border)" }} />

            <section>
              <h2 className="mb-3 text-sm font-semibold text-[var(--ks-text)]">Reviews</h2>
              <ReviewList reviews={property.reviews} />
            </section>
          </div>

          <div className="w-full shrink-0 lg:w-80">
            <div className="lg:sticky lg:top-20">
              <WriteReviewGate
                propertyId={property.id}
                propertyName={property.name}
                categoryId={property.categoryId}
                relationships={relationships}
                isHousing={property.isHousing}
              />

              <div className="mt-3">
                <SourceCredit propertyId={property.id} source={property.source} ownerVerified={property.ownerVerified} />
              </div>

              <p className="mt-3 text-[11px] leading-relaxed" style={{ color: "var(--ks-text-faint)" }}>
                Approval by KiraayaSense confirms this is a real, non-duplicate listing — it is not an
                endorsement of the business or its management. Reviews are user-generated content.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
