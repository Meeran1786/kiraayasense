import Link from "next/link";
import { BadgeCheck } from "lucide-react";

// Listings no longer name the open dataset they came from. The licence credit
// for those datasets lives once, on the Terms page (#data-credits), which the
// footer links to on every page.

export function SourceCredit({
  propertyId,
  ownerVerified,
}: {
  propertyId: string;
  ownerVerified: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 text-[11px] leading-relaxed" style={{ color: "var(--ks-text-faint)" }}>
      {ownerVerified ? (
        <p className="flex items-center gap-1 font-medium" style={{ color: "oklch(70% 0.15 150)" }}>
          <BadgeCheck size={12} /> Managed by a verified owner
        </p>
      ) : (
        <p>
          Own or manage this business?{" "}
          <Link href={`/property/${propertyId}/claim`} rel="nofollow" className="font-medium text-[var(--ks-text-muted)] underline">
            Claim this listing
          </Link>{" "}
          to correct its details and respond to reviews.
        </p>
      )}
    </div>
  );
}
