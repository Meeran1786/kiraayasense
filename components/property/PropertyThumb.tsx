import { Building2 } from "lucide-react";

/**
 * The listing's cover: its newest approved review photo when there is one,
 * otherwise a deterministic tinted tile. Never a stock photo, which would
 * misrepresent a real address.
 */
export function PropertyThumb({
  tone,
  name,
  className,
  src,
}: {
  tone: string;
  name: string;
  className?: string;
  src?: string;
}) {
  if (src) {
    return (
      <div className={`overflow-hidden ${className ?? ""}`} style={{ background: "var(--ks-bg-elevated-2)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- user uploads served by nginx */}
        <img src={src} alt={`Photo of ${name}`} loading="lazy" className="h-full w-full object-cover" />
      </div>
    );
  }
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
