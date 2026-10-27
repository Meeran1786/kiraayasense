import Link from "next/link";
import { EyeOff, ShieldCheck, Star } from "lucide-react";
import type { ProfileReview } from "@/lib/db/users";
import { RELATIONSHIP_BADGES } from "@/lib/relationships";

const STATUS_LABELS: Record<ProfileReview["status"], string> = {
  PENDING_REVIEW: "Awaiting moderation",
  APPROVED: "Published",
  REJECTED: "Not approved",
  SUSPENDED: "Under re-review",
};

/** A reviewer's reviews. `showStatus` is for the owner's own view only. */
export function ProfileReviewList({ reviews, showStatus = false }: { reviews: ProfileReview[]; showStatus?: boolean }) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-xl border p-6 text-center text-sm" style={{ borderColor: "var(--ks-border)", color: "var(--ks-text-faint)" }}>
        No reviews yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {reviews.map((r) => (
        <article
          key={r.id}
          className="rounded-xl border p-4"
          style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <Link href={`/property/${r.business.id}`} className="text-sm font-semibold text-[var(--ks-text)] hover:underline">
                {r.business.name}
              </Link>
              <p className="text-xs text-[var(--ks-text-faint)]">
                {r.business.category} · {r.business.locality} · {RELATIONSHIP_BADGES[r.relationship]}
              </p>
            </div>
            {r.overall !== null && (
              <span className="flex items-center gap-1 text-sm font-semibold text-[var(--ks-text)]">
                <Star size={13} className="fill-current" style={{ color: "var(--ks-warn)" }} />
                {r.overall.toFixed(1)}
              </span>
            )}
          </div>
          {r.firstReason && <p className="mt-2 line-clamp-2 text-sm text-[var(--ks-text-muted)]">{r.firstReason}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[var(--ks-text-faint)]">
            <span>{r.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            {showStatus && <span className="font-medium text-[var(--ks-text-muted)]">{STATUS_LABELS[r.status]}</span>}
            {showStatus && r.isAnonymous && (
              <span className="flex items-center gap-1">
                <EyeOff size={11} /> Posted anonymously
              </span>
            )}
            {r.proofVerified && (
              <span className="flex items-center gap-1" style={{ color: "oklch(70% 0.15 150)" }}>
                <ShieldCheck size={11} /> Proof verified
              </span>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
