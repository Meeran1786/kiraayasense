import Link from "next/link";
import { Coins, History, ImageIcon, ShieldCheck, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { HelpfulButton } from "@/components/property/HelpfulButton";
import { ReportButton } from "@/components/property/ReportButton";
import type { DbReview } from "@/lib/db/properties";
import { RELATIONSHIP_BADGES } from "@/lib/relationships";
import { brand } from "@/lib/brand";

export function ReviewList({
  reviews,
  votedByViewer = [],
  renderOwnerTools,
}: {
  reviews: DbReview[];
  votedByViewer?: string[];
  /** The owner dashboard passes its reply box here; it replaces the public reply. */
  renderOwnerTools?: (review: DbReview) => React.ReactNode;
}) {
  const voted = new Set(votedByViewer);
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
              <p className="text-sm font-medium text-[var(--ks-text)]">
                {review.reviewer && (
                  <>
                    <Link href={`/u/${review.reviewer.handle}`} className="hover:underline">
                      {review.reviewer.name}
                    </Link>
                    <span className="text-[var(--ks-text-faint)]"> · </span>
                  </>
                )}
                {RELATIONSHIP_BADGES[review.relationship]}
              </p>
              <p className="text-xs text-[var(--ks-text-faint)]">
                {review.earlierVisits.length > 0 ? "Latest visit · " : ""}
                {review.postedAgo}
              </p>
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

          {review.photoUrls.length > 0 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {review.photoUrls.map((url) => (
                <a key={url} href={url} target="_blank" rel="noopener" className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- user uploads served by nginx */}
                  <img src={url} alt="Photo from this review" loading="lazy" className="h-20 w-20 rounded-lg object-cover" />
                </a>
              ))}
            </div>
          ) : (
            review.mediaCount > 0 && (
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[var(--ks-text-faint)]">
                <ImageIcon size={12} />
                {review.mediaCount} photo{review.mediaCount === 1 ? "" : "s"}/video attached
              </div>
            )
          )}

          {renderOwnerTools ? (
            renderOwnerTools(review)
          ) : review.ownerResponse && (
            <div
              className="mt-3 rounded-lg border-l-2 px-3 py-2 text-xs"
              style={{ borderColor: brand.coral, background: "var(--ks-bg-elevated-2)", color: "var(--ks-text-muted)" }}
            >
              <span className="font-semibold text-[var(--ks-text-muted)]">Reply from the verified owner: </span>
              {review.ownerResponse}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <HelpfulButton reviewId={review.id} initialCount={review.helpfulCount} initialVoted={voted.has(review.id)} />
            <div className="flex items-center gap-3">
              {review.rewarded && (
                <span className="flex items-center gap-1 text-[11px] text-[var(--ks-text-faint)]" title="This reviewer earned KiraayaSense points for a verified review. Points never depend on the rating given.">
                  <Coins size={11} /> Earned points
                </span>
              )}
              <ReportButton reviewId={review.id} />
            </div>
          </div>

          {review.earlierVisits.length > 0 && (
            <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--ks-border)" }}>
              <p className="mb-2 flex items-center gap-1 text-[11px] font-medium text-[var(--ks-text-faint)]">
                <History size={11} /> Earlier visit{review.earlierVisits.length === 1 ? "" : "s"}
              </p>
              <ul className="flex flex-col gap-2">
                {review.earlierVisits.map((visit) => (
                  <li key={visit.id} className="text-xs text-[var(--ks-text-muted)]">
                    <span className="mr-2 inline-flex items-center gap-1 font-medium text-[var(--ks-text)]">
                      {visit.overall !== null && (
                        <>
                          <Star size={11} className="fill-current" style={{ color: "var(--ks-warn)" }} />
                          {visit.overall.toFixed(1)}
                        </>
                      )}
                      <span className="font-normal text-[var(--ks-text-faint)]">· {visit.postedOn}</span>
                    </span>
                    {visit.reasons[0]?.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
