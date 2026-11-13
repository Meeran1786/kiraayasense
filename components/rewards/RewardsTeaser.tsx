import Link from "next/link";
import { Coins } from "lucide-react";
import { POINTS, formatRupees } from "@/lib/rewards";
import { PayoutProgress } from "@/components/rewards/PayoutProgress";

/** Rewards card on your own profile: rupee value, progress to ₹100 and a nudge. */
export function RewardsTeaser({ available, pending }: { available: number; pending: number }) {
  const total = available + pending;
  const best = POINTS.VERIFIED_REVIEW + POINTS.PHOTO;
  return (
    <Link
      href="/profile/rewards"
      className="flex flex-col gap-3 rounded-xl border p-4 transition-opacity hover:opacity-90"
      style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--ks-text)]">
          <Coins size={15} style={{ color: "var(--ks-warn)" }} /> Your points are worth {formatRupees(total)}
        </p>
        <p className="text-xs text-[var(--ks-text-faint)]">
          {formatRupees(available)} available · {formatRupees(pending)} on hold
        </p>
      </div>
      <PayoutProgress available={available} pending={pending} compact />
      <p className="text-xs text-[var(--ks-text-muted)]">
        {total === 0
          ? `Write your first review with proof and a photo to earn ${best} points (${formatRupees(best)}).`
          : `Your next verified review with a photo earns ${best} points (${formatRupees(best)}).`}{" "}
        <span className="font-medium text-[var(--ks-coral)]">Open My Rewards →</span>
      </p>
    </Link>
  );
}
