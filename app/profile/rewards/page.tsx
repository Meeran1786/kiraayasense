import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowLeft, Camera, Clock, Coins, Repeat, ShieldCheck, ThumbsUp, Wallet } from "lucide-react";
import { authOptions } from "@/lib/auth";
import {
  HOLD_DAYS,
  MAX_HELPFUL_POINTS_PER_REVIEW,
  MAX_REWARDED_REVIEWS_PER_DAY,
  PAYOUT_RUPEES,
  POINTS,
  POINTS_PER_PAYOUT,
  formatRupees,
  payoutProgress,
  rewardsSummary,
  type RewardsSummary,
} from "@/lib/rewards";
import { PayoutProgress } from "@/components/rewards/PayoutProgress";
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
  const { payoutsReady } = payoutProgress(summary.available, summary.pending);
  const now = new Date();
  // Helpful votes on one review on one day show as a single "×N" row.
  const history: (RewardsSummary["history"][number] & { count: number })[] = [];
  for (const e of summary.history) {
    const last = history[history.length - 1];
    if (last && last.kind === e.kind && last.business.id === e.business.id && fmtDate(last.createdAt) === fmtDate(e.createdAt)) {
      last.points += e.points;
      last.count++;
    } else history.push({ ...e, count: 1 });
  }

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

        <section className="flex flex-col gap-4 rounded-xl border p-5" style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs text-[var(--ks-text-faint)]">Your points are worth</p>
              <p className="text-3xl font-bold text-[var(--ks-text)]">{formatRupees(summary.total)}</p>
              <p className="text-xs text-[var(--ks-text-muted)]">
                {summary.total.toLocaleString("en-IN")} points · {POINTS_PER_PAYOUT.toLocaleString("en-IN")} points = ₹{PAYOUT_RUPEES}
              </p>
            </div>
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-lg px-4 py-2 text-sm font-semibold text-slate-950 opacity-60"
                style={{ background: "var(--ks-success)" }}
                title="Payouts to UPI or bank are coming soon"
              >
                {payoutsReady > 0 ? `Redeem ${formatRupees(payoutsReady * POINTS_PER_PAYOUT)}` : "Redeem"} · coming soon
              </button>
              <p className="text-[11px] text-[var(--ks-text-faint)]">
                {payoutsReady > 0
                  ? "Ready to redeem. We'll let you know when payouts open."
                  : `You can redeem from ₹${PAYOUT_RUPEES} (${POINTS_PER_PAYOUT.toLocaleString("en-IN")} available points).`}
              </p>
            </div>
          </div>
          <PayoutProgress available={summary.available} pending={summary.pending} />
          <p className="text-[11px] text-[var(--ks-text-faint)]">
            Payouts will go straight to your UPI or bank account. Redeeming isn&apos;t open yet, but every point you earn now is saved and
            keeps its value.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card label="Total points" value={summary.total} />
          <Card label="Available" value={summary.available} hint="Finished the 30-day hold" />
          <Card
            label="On hold"
            value={summary.pending}
            hint={
              summary.nextUnlock
                ? `${summary.nextUnlock.points} unlock on ${fmtDate(summary.nextUnlock.at)}`
                : `Held for ${HOLD_DAYS} days after you earn them`
            }
          />
        </section>

        <section className="rounded-xl border p-4" style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}>
          <h2 className="text-sm font-semibold text-[var(--ks-text)]">Earn more</h2>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Nudge icon={<ShieldCheck size={16} />} points={POINTS.VERIFIED_REVIEW} title="Write a review with proof">
              Attach a bill, rent receipt or UPI payment so it gets verified.
            </Nudge>
            <Nudge icon={<Camera size={16} />} points={POINTS.PHOTO} title="Add a photo">
              Photos of the room, food or building earn {POINTS.PHOTO} more on a verified review.
            </Nudge>
            <Nudge icon={<ThumbsUp size={16} />} points={POINTS.HELPFUL_VOTE} title="Get Helpful votes">
              Detailed, useful reviews get marked helpful. {POINTS.HELPFUL_VOTE} point each, up to {MAX_HELPFUL_POINTS_PER_REVIEW} per review.
            </Nudge>
            <Nudge icon={<Repeat size={16} />} points={POINTS.VERIFIED_REVIEW} title="Review a new visit">
              Stayed again? Add a new visit 30 days after the last one.
            </Nudge>
          </ul>
          <Link
            href="/search"
            className="mt-3 inline-block rounded-lg px-4 py-2 text-sm font-semibold text-slate-950"
            style={{ background: "var(--ks-coral)" }}
          >
            Find a place to review
          </Link>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-[var(--ks-text)]">History</h2>
          {history.length === 0 ? (
            <div className="rounded-xl border p-6 text-center text-sm" style={{ borderColor: "var(--ks-border)", color: "var(--ks-text-faint)" }}>
              No points yet. Write a review with proof (a bill, receipt or UPI payment) to earn your first {POINTS.VERIFIED_REVIEW}.
            </div>
          ) : (
            <ul className="divide-y rounded-xl border" style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}>
              {history.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3" style={{ borderColor: "var(--ks-border)" }}>
                  <div className="min-w-0">
                    <p className="text-sm text-[var(--ks-text)]">
                      {KIND_LABELS[e.kind]}
                      {e.count > 1 && ` ×${e.count}`} ·{" "}
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
                  <span className="shrink-0 text-right text-sm font-semibold" style={{ color: "var(--ks-success)" }}>
                    +{e.points}
                    <span className="block text-[10px] font-normal text-[var(--ks-text-faint)]">{formatRupees(e.points)}</span>
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
            <li>
              {POINTS_PER_PAYOUT.toLocaleString("en-IN")} points are worth ₹{PAYOUT_RUPEES} (₹{(PAYOUT_RUPEES / POINTS_PER_PAYOUT).toFixed(2)} a point).
              Points count toward a payout once they finish the {HOLD_DAYS}-day hold.
            </li>
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

function Nudge({ icon, points, title, children }: { icon: React.ReactNode; points: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 rounded-lg border p-3" style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated-2)" }}>
      <span className="mt-0.5 shrink-0 text-[var(--ks-coral)]">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--ks-text)]">
          {title}{" "}
          <span className="text-xs font-semibold" style={{ color: "var(--ks-success)" }}>
            +{points} ({formatRupees(points)})
          </span>
        </p>
        <p className="text-xs text-[var(--ks-text-muted)]">{children}</p>
      </div>
    </li>
  );
}

function Card({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}>
      <p className="text-2xl font-bold text-[var(--ks-text)]">{value.toLocaleString("en-IN")}</p>
      <p className="text-xs text-[var(--ks-text-faint)]">
        {label} · {formatRupees(value)}
      </p>
      {hint && <p className="mt-1 text-[11px] text-[var(--ks-text-faint)]">{hint}</p>}
    </div>
  );
}
