import Link from "next/link";
import { BadgeCheck, Database } from "lucide-react";
import type { DataSourceKey } from "@/lib/db/properties";

// Each open dataset's licence requires this credit wherever its data is shown.
const CREDITS: Partial<Record<DataSourceKey, { label: string; href: string }>> = {
  OSM: { label: "© OpenStreetMap contributors (ODbL)", href: "https://www.openstreetmap.org/copyright" },
  OVERTURE: { label: "Overture Maps Foundation (CDLA-Permissive-2.0)", href: "https://overturemaps.org" },
  MCA: { label: "Ministry of Corporate Affairs, via data.gov.in (GODL-India)", href: "https://data.gov.in" },
};

export function SourceCredit({
  propertyId,
  source,
  ownerVerified,
}: {
  propertyId: string;
  source: DataSourceKey;
  ownerVerified: boolean;
}) {
  const credit = CREDITS[source];

  return (
    <div className="flex flex-col gap-1 text-[11px] leading-relaxed" style={{ color: "var(--ks-text-faint)" }}>
      {ownerVerified ? (
        <p className="flex items-center gap-1 font-medium" style={{ color: "oklch(70% 0.15 150)" }}>
          <BadgeCheck size={12} /> Managed by a verified owner
        </p>
      ) : (
        <p>
          Own or manage this business?{" "}
          <Link href={`/property/${propertyId}/claim`} className="font-medium text-[var(--ks-text-muted)] underline">
            Claim this listing
          </Link>{" "}
          to correct its details and respond to reviews.
        </p>
      )}
      {credit && (
        <p className="flex items-center gap-1">
          <Database size={11} className="shrink-0" />
          <span>
            Created from public data:{" "}
            <a href={credit.href} target="_blank" rel="noopener noreferrer" className="underline">
              {credit.label}
            </a>
          </span>
        </p>
      )}
    </div>
  );
}
