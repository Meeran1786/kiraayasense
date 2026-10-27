import Link from "next/link";
import { MapPin, ShieldCheck } from "lucide-react";
import { PropertyThumb } from "./PropertyThumb";
import { RatingBadge } from "./RatingBadge";
import type { DbProperty } from "@/lib/db/properties";

export function PropertyCard({ property }: { property: DbProperty }) {
  return (
    <Link
      href={`/property/${property.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border transition-colors hover:border-[var(--ks-border-strong)]"
      style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}
    >
      <PropertyThumb tone={property.heroTone} name={property.name} className="h-36 w-full" />

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--ks-text)] group-hover:underline">{property.name}</h3>
          <RatingBadge rating={property.overallRating} />
        </div>

        <p className="text-xs" style={{ color: "var(--ks-text-muted)" }}>
          {property.parentCategoryName ? `${property.parentCategoryName} · ` : ""}
          {property.categoryName}
        </p>

        <p className="flex items-center gap-1 text-xs" style={{ color: "var(--ks-text-faint)" }}>
          <MapPin size={12} />
          {property.locality}, {property.district}
        </p>

        <div className="mt-auto flex items-center justify-between pt-2 text-xs" style={{ color: "var(--ks-text-faint)" }}>
          <span>
            {property.approvedReviewCount} review{property.approvedReviewCount === 1 ? "" : "s"}
          </span>
          <span className="flex items-center gap-1" style={{ color: "oklch(70% 0.15 150)" }}>
            <ShieldCheck size={12} />
            {property.verifiedProofCount} verified
          </span>
        </div>
      </div>
    </Link>
  );
}
