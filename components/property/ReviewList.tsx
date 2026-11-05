import Link from "next/link";
import { Coins, History, ImageIcon, ShieldCheck, Star } from "lucide-react";
import { HelpfulButton } from "@/components/property/HelpfulButton";
import { ReportButton } from "@/components/property/ReportButton";
import type { DbReview } from "@/lib/db/properties";
import { ReviewText } from "@/components/property/ReviewText";
import { getT } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n/translate";
import { translationProvider } from "@/lib/translation";
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
  const t = getT();
  const canTranslate = translationProvider() !== null;
  if (reviews.length === 0) {
    return (
      <div
        className="rounded-xl border p-6 text-center text-sm"
        style={{ borderColor: "var(--ks-border)", color: "var(--ks-text-faint)" }}
      >
        {t("review.none")}
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
                {t(`rel.${review.relationship}`)}
              </p>
              <p className="text-xs text-[var(--ks-text-faint)]">
                {review.earlierVisits.length > 0 ? `${t("review.latestVisit")} · ` : ""}
                {timeAgo(t, review.createdAt)}
              </p>
            </div>
            {review.proofVerified && (
              <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: "oklch(70% 0.15 150)" }}>
                <ShieldCheck size={12} />
                {t("review.proofVerified")}
              </span>
            )}
          </div>

          <ReviewText reviewId={review.id} reasons={review.reasons} canTranslate={canTranslate} />

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
                {t.n("review.media", review.mediaCount)}
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
              <span className="font-semibold text-[var(--ks-text-muted)]">{t("review.ownerReply")} </span>
              <bdi>{review.ownerResponse}</bdi>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <HelpfulButton reviewId={review.id} initialCount={review.helpfulCount} initialVoted={voted.has(review.id)} />
            <div className="flex items-center gap-3">
              {review.rewarded && (
                <span className="flex items-center gap-1 text-[11px] text-[var(--ks-text-faint)]" title={t("review.earnedPointsHint")}>
                  <Coins size={11} /> {t("review.earnedPoints")}
                </span>
              )}
              <ReportButton reviewId={review.id} />
            </div>
          </div>

          {review.earlierVisits.length > 0 && (
            <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--ks-border)" }}>
              <p className="mb-2 flex items-center gap-1 text-[11px] font-medium text-[var(--ks-text-faint)]">
                <History size={11} /> {t.n("review.earlierVisits", review.earlierVisits.length)}
              </p>
              <ul className="flex flex-col gap-2">
                {review.earlierVisits.map((visit) => (
                  <li key={visit.id} className="text-xs text-[var(--ks-text-muted)]">
                    <span className="me-2 inline-flex items-center gap-1 font-medium text-[var(--ks-text)]">
                      {visit.overall !== null && (
                        <>
                          <Star size={11} className="fill-current" style={{ color: "var(--ks-warn)" }} />
                          {visit.overall.toFixed(1)}
                        </>
                      )}
                      <span className="font-normal text-[var(--ks-text-faint)]">· {visit.postedOn}</span>
                    </span>
                    <bdi>{visit.reasons[0]?.text}</bdi>
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

/** "3 days ago" in the reader's language. */
function timeAgo(t: Translator, iso: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  const rtf = new Intl.RelativeTimeFormat(t.locale === "en" ? "en-IN" : t.locale, { numeric: "auto" });
  for (const [unit, secs] of units) {
    if (Math.abs(seconds) >= secs) return rtf.format(Math.trunc(seconds / secs), unit);
  }
  return rtf.format(0, "minute");
}
