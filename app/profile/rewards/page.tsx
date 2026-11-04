import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowLeft, Clock, Coins, Wallet } from "lucide-react";
import { authOptions } from "@/lib/auth";
import {
  HOLD_DAYS,
  MAX_HELPFUL_POINTS_PER_REVIEW,
  MAX_REWARDED_REVIEWS_PER_DAY,
  MIN_WITHDRAWAL_RUPEES,
  POINTS,
  POOL_SHARE,
  cashRewardsEnabled,
  rewardsSummary,
} from "@/lib/rewards";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { Footer } from "@/components/layout/Footer";
import { brand } from "@/lib/brand";

export const metadata = { title: "My Rewards — KiraayaSense", robots: { index: false } };
export const dynamic = "force-dynamic";

const KIND_LABELS = { VERIFIED_REVIEW: "Verified review", PHOTO: "Photo bonus", HELPFUL_VOTE: "Marked helpful" } as const;
const fmtDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default async function RewardsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return (
      <main style={{ background: brand.navy, minHeight: "100vh" }}>
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <SignInPrompt />
        </div>
        <Footer />
      </main>
    );
  }

  const summary = await rewardsSummary(session.user.id);
  const cash = cashRewardsEnabled();
  const now = new Date();

  return (
    <main style={{ background: brand.navy, minHeight: "100vh" }}>
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div>
          <Link href="/profile" className="flex items-center gap-1 text-xs text-[var(--ks-text-faint)] hover:underline">
            <ArrowLeft size={12} /> Your profile
          </Link>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-[var(--ks-text)]">
            <Wallet size={22} /> My Rewards
          </h1>
        </div>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card label="Total points" value={summary.total} />
          <Card label="Available" value={summary.available} hint="Ready to count toward rewards" />
          <Card label="Pending" value={summary.pending} hint={`Held for ${HOLD_DAYS} days after you earn them`} />
        </section>

        <section className="rounded-xl border p-4" style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}>
          <h2 className="text-sm font-semibold text-[var(--ks-text)]">Cash rewards</h2>
          {cash ? (
            <>
              <p className="mt-1 text-sm text-[var(--ks-text-muted)]">
                Each month, {Math.round(POOL_SHARE * 100)}% of KiraayaSense&apos;s ad income goes into a reward pool, shared by
                everyone&apos;s available points. You can withdraw to UPI once your share reaches ₹{MIN_WITHDRAWAL_RUPEES}.
              </p>
              <button
                type="button"
                disabled
                className="mt-3 rounded-lg px-4 py-2 text-sm font-semibold text-slate-950 opacity-60"
                style={{ background: "var(--ks-success)" }}
              >
                Withdraw to UPI
              </button>
            </>
          ) : (
            <p className="mt-1 text-sm text-[var(--ks-text-muted)]">
              Cash rewards are coming soon. Every point you earn now is saved and will count when payouts start.
            </p>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-[var(--ks-text)]">History</h2>
          {summary.history.length === 0 ? (
            <div className="rounded-xl border p-6 text-center text-sm" style={{ borderColor: "var(--ks-border)", color: "var(--ks-text-faint)" }}>
              No points yet. Write a review with proof (a bill, receipt or UPI payment) to earn your first {POINTS.VERIFIED_REVIEW}.
            </div>
          ) : (
            <ul className="divide-y rounded-xl border" style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}>
              {summary.history.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3" style={{ borderColor: "var(--ks-border)" }}>
                  <div className="min-w-0">
                    <p className="text-sm text-[var(--ks-text)]">
                      {KIND_LABELS[e.kind]} ·{" "}
                      <Link href={`/property/${e.business.id}`} className="hover:underline">
                        {e.business.name}
                      </Link>
                    </p>
                    <p className="flex items-center gap-1 text-[11px] text-[var(--ks-text-faint)]">
                      {fmtDate(e.createdAt)}
                      {e.availableAt > now && (
                        <>
                          {" "}
                          · <Clock size={10} /> available {fmtDate(e.availableAt)}
                        </>
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold" style={{ color: "var(--ks-success)" }}>
                    +{e.points}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border p-4 text-xs text-[var(--ks-text-muted)]" style={{ borderColor: "var(--ks-border)" }}>
          <h2 className="mb-2 flex items-center gap-1 text-sm font-semibold text-[var(--ks-text)]">
            <Coins size={14} /> How points work
          </h2>
          <ul className="flex list-disc flex-col gap-1 pl-4">
            <li>{POINTS.VERIFIED_REVIEW} points for each review approved with proof, and {POINTS.PHOTO} more if it has a photo.</li>
            <li>
              {POINTS.HELPFUL_VOTE} point each time someone marks your verified review helpful, up to {MAX_HELPFUL_POINTS_PER_REVIEW} per review.
            </li>
            <li>Points are the same whatever rating you give. Honest reviews, good or bad, earn the same.</li>
            <li>You can add a new visit to the same business every 30 days. Each verified visit earns points again.</li>
            <li>Up to {MAX_REWARDED_REVIEWS_PER_DAY} reviews a day earn points. Points are removed if a review is later taken down.</li>
          </ul>
        </section>
      </div>
      <Footer />
    </main>
  );
}

function Card({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}>
      <p className="text-2xl font-bold text-[var(--ks-text)]">{value.toLocaleString("en-IN")}</p>
      <p className="text-xs text-[var(--ks-text-faint)]">{label}</p>
      {hint && <p className="mt-1 text-[11px] text-[var(--ks-text-faint)]">{hint}</p>}
    </div>
  );
}
