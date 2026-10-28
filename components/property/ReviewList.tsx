import { ImageIcon, ShieldCheck, ThumbsDown, ThumbsUp } from "lucide-react";
import type { DbReview } from "@/lib/db/properties";
import { RELATIONSHIP_BADGES } from "@/lib/relationships";
import { brand } from "@/lib/brand";

export function ReviewList({ reviews }: { reviews: DbReview[] }) {
  if (reviews.length === 0) {
    return (
      <div
        className="rounded-xl border p-6 text-center text-sm"
        style={{ borderColor: "var(--ks-border)", color: "var(--ks-text-faint)" }}
      >
        No approved reviews yet. Be the first to review this business.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {reviews.map((review) => (
        <article
          key={review.id}
          className="rounded-xl border p-4"
          style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
              style={{ background: "var(--ks-border-soft)", color: brand.white }}
            >
              {review.reviewerInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--ks-text)]">{RELATIONSHIP_BADGES[review.relationship]}</p>
              <p className="text-xs text-[var(--ks-text-faint)]">{review.postedAgo}</p>
            </div>
            {review.proofVerified && (
              <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: "oklch(70% 0.15 150)" }}>
                <ShieldCheck size={12} />
                Proof verified
              </span>
            )}
          </div>

          <ul className="mt-3 flex flex-col gap-1.5">
            {review.reasons.map((reason, idx) => {
              const Icon = reason.type === "PRO" ? ThumbsUp : ThumbsDown;
              return (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <Icon
                    size={14}
                    className="mt-0.5 shrink-0"
                    style={{ color: reason.type === "PRO" ? brand.success : brand.danger }}
                  />
                  <span className="text-[var(--ks-text-muted)]">
                    <span className="text-[var(--ks-text-faint)]">{reason.label}: </span>
                    {reason.text}
                  </span>
                </li>
              );
            })}
          </ul>

          {review.facts.length > 0 && (
            <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
              {review.facts.map((fact) => (
                <div key={fact.label} className="flex gap-1">
                  <dt className="text-[var(--ks-text-faint)]">{fact.label}</dt>
                  <dd className="font-medium text-[var(--ks-text-muted)]">{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {review.mediaCount > 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[var(--ks-text-faint)]">
              <ImageIcon size={12} />
              {review.mediaCount} photo{review.mediaCount === 1 ? "" : "s"}/video attached
            </div>
          )}

          {review.ownerResponse && (
            <div
              className="mt-3 rounded-lg border-l-2 px-3 py-2 text-xs"
              style={{ borderColor: brand.coral, background: "var(--ks-bg-elevated-2)", color: "var(--ks-text-muted)" }}
            >
              <span className="font-semibold text-[var(--ks-text-muted)]">Response from management: </span>
              {review.ownerResponse}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
