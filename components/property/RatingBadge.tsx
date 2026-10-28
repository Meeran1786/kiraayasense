import { Star } from "lucide-react";
import { brand } from "@/lib/brand";

export function RatingBadge({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const isLg = size === "lg";
  // A 0 means no approved ratings yet, not a terrible score.
  if (rating === 0) {
    return (
      <div
        className={`inline-flex items-center rounded-md border font-semibold ${isLg ? "px-2.5 py-1 text-sm" : "px-1.5 py-0.5 text-[11px]"}`}
        style={{ borderColor: "var(--ks-border-strong)", color: "var(--ks-text-muted)" }}
      >
        Not rated yet
      </div>
    );
  }
  return (
    <div
      className={`inline-flex items-center gap-1 rounded-md font-bold ${isLg ? "px-2.5 py-1 text-base" : "px-1.5 py-0.5 text-xs"}`}
      style={{ background: ratingColor(rating), color: "oklch(15% 0.02 150)" }}
    >
      <Star size={isLg ? 16 : 12} fill="currentColor" strokeWidth={0} />
      {rating.toFixed(1)}
    </div>
  );
}

function ratingColor(rating: number) {
  if (rating >= 4) return brand.success;
  if (rating >= 3) return brand.warn;
  return brand.coral; // needs attention
}
