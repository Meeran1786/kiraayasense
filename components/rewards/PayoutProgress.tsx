import { PAYOUT_RUPEES, POINTS_PER_PAYOUT, payoutProgress, reviewsWithPhotoFor } from "@/lib/rewards";

/**
 * Progress bar toward the next ₹100 payout: solid for available points,
 * striped for points still in their 30-day hold.
 */
export function PayoutProgress({ available, pending, compact = false }: { available: number; pending: number; compact?: boolean }) {
  const p = payoutProgress(available, pending);
  const pct = (n: number) => `${(n / POINTS_PER_PAYOUT) * 100}%`;
  const reviews = reviewsWithPhotoFor(p.toEarn);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-[var(--ks-text)]">
          {(p.availableInStep + p.pendingInStep).toLocaleString("en-IN")} / {POINTS_PER_PAYOUT.toLocaleString("en-IN")} points
        </span>
        <span className="text-[var(--ks-text-faint)]">Next ₹{PAYOUT_RUPEES}</span>
      </div>
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full"
        style={{ background: "var(--ks-bg-elevated-2)" }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={POINTS_PER_PAYOUT}
        aria-valuenow={p.availableInStep + p.pendingInStep}
        aria-label={`Points toward your next ₹${PAYOUT_RUPEES}`}
      >
        <div style={{ width: pct(p.availableInStep), background: "var(--ks-success)" }} />
        <div
          style={{
            width: pct(p.pendingInStep),
            background:
              "repeating-linear-gradient(135deg, var(--ks-warn) 0 4px, color-mix(in oklch, var(--ks-warn) 55%, transparent) 4px 8px)",
          }}
        />
      </div>
      {!compact && (p.availableInStep > 0 || p.pendingInStep > 0) && (
        <div className="flex flex-wrap gap-x-3 text-[11px] text-[var(--ks-text-faint)]">
          <span className="flex items-center gap-1">
            <i className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--ks-success)" }} /> Available
          </span>
          <span className="flex items-center gap-1">
            <i className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--ks-warn)" }} /> On hold (30 days)
          </span>
        </div>
      )}
      <p className="text-xs text-[var(--ks-text-muted)]">
        {p.toEarn === 0 ? (
          <>You&apos;ve earned enough for your next ₹{PAYOUT_RUPEES}. It unlocks when the held points finish their 30 days.</>
        ) : (
          <>
            <strong className="text-[var(--ks-text)]">{p.toEarn.toLocaleString("en-IN")} more points</strong> to your next ₹{PAYOUT_RUPEES}.
            That&apos;s about {reviews} verified review{reviews === 1 ? "" : "s"} with a photo.
          </>
        )}
      </p>
    </div>
  );
}
