import { Building2 } from "lucide-react";

/**
 * Stand-in for a real property photo. No image pipeline exists in this
 * local harness (that's S3/R2 + moderation in production — FR-REV-4/5), so
 * listings use a deterministic tinted tile with the property's initial
 * instead of a broken <img> or a stock photo that would misrepresent a real
 * address.
 */
export function PropertyThumb({
  tone,
  name,
  className,
}: {
  tone: string;
  name: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center overflow-hidden ${className ?? ""}`}
      style={{ background: `linear-gradient(160deg, ${tone}, var(--ks-bg))` }}
    >
      <Building2 size={28} strokeWidth={1.5} className="text-white/70" />
      <span className="sr-only">{name}</span>
    </div>
  );
}
