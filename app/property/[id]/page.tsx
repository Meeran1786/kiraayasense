import { notFound } from "next/navigation";
import { MapPin, IndianRupee } from "lucide-react";
import { getPropertyById } from "@/lib/db/properties";
import { CATEGORY_LABELS } from "@/lib/constants";
import { PropertyThumb } from "@/components/property/PropertyThumb";
import { RatingBadge } from "@/components/property/RatingBadge";
import { CategoryBreakdown } from "@/components/property/CategoryBreakdown";
import { ReviewList } from "@/components/property/ReviewList";
import { WriteReviewGate } from "@/components/property/WriteReviewGate";
import { Footer } from "@/components/layout/Footer";
import { brand } from "@/lib/brand";

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  const property = await getPropertyById(params.id);
  if (!property) notFound();

  return (
    <main style={{ background: brand.navy, minHeight: "100vh" }}>
      <PropertyThumb tone={property.heroTone} name={property.name} className="h-56 w-full sm:h-72" />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-[var(--ks-text)]">{property.name}</h1>
                <p className="mt-1 text-sm" style={{ color: "var(--ks-text-muted)" }}>
                  {CATEGORY_LABELS[property.category]}
                </p>
                <p className="mt-1 flex items-center gap-1 text-sm" style={{ color: "var(--ks-text-faint)" }}>
                  <MapPin size={14} />
                  {property.locality}, {property.district}, {property.state} — {property.pincode}
                </p>
                <p className="mt-1 flex items-center gap-1 text-sm" style={{ color: "var(--ks-text-faint)" }}>
                  <IndianRupee size={13} />
                  {property.approxRentMin.toLocaleString("en-IN")}–{property.approxRentMax.toLocaleString("en-IN")}
                  <span className="text-xs text-[var(--ks-text-faint)]">/month, self-reported by reviewers</span>
                </p>
              </div>
              <RatingBadge rating={property.overallRating} size="lg" />
            </div>

            <hr className="my-6 border-0 border-t" style={{ borderColor: "var(--ks-border)" }} />

            <section>
              <h2 className="mb-3 text-sm font-semibold text-[var(--ks-text)]">
                Grievance ratings <span className="font-normal text-[var(--ks-text-faint)]">({property.approvedReviewCount} verified reviews)</span>
              </h2>
              <CategoryBreakdown categoryAverages={property.categoryAverages} />
            </section>

            <hr className="my-6 border-0 border-t" style={{ borderColor: "var(--ks-border)" }} />

            <section>
              <h2 className="mb-3 text-sm font-semibold text-[var(--ks-text)]">Tenant reviews</h2>
              <ReviewList reviews={property.reviews} />
            </section>
          </div>

          <div className="w-full shrink-0 lg:w-80">
            <div className="lg:sticky lg:top-20">
              <WriteReviewGate propertyId={property.id} propertyName={property.name} />

              <p className="mt-3 text-[11px] leading-relaxed" style={{ color: "var(--ks-text-faint)" }}>
                Approval by KiraayaSense confirms this is a real, non-duplicate listing — it is not an
                endorsement of the property's condition or management.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
