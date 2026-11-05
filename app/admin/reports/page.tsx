import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { FLAG_REASONS, type FlagReason } from "@/lib/flags";
import { ReportDecision } from "./ReportDecision";

/** Reviews with open reports. Hidden (suspended) ones first, then by oldest report. */
export default async function AdminReportsPage() {
  const reviews = await prisma.review.findMany({
    where: { OR: [{ status: "SUSPENDED" }, { status: "APPROVED", flags: { some: { resolution: "OPEN" } } }] },
    take: 50,
    include: {
      property: true,
      user: true,
      reasons: true,
      proofs: { select: { status: true } },
      questionSet: { include: { questions: true } },
      flags: { where: { resolution: "OPEN" }, include: { flaggedByUser: true }, orderBy: { createdAt: "asc" } },
    },
  });
  reviews.sort(
    (a, b) =>
      Number(b.status === "SUSPENDED") - Number(a.status === "SUSPENDED") ||
      (a.flags[0]?.createdAt.getTime() ?? 0) - (b.flags[0]?.createdAt.getTime() ?? 0)
  );

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--ks-text)]">Reported reviews</h1>
      <p className="mt-1 max-w-2xl text-sm text-[var(--ks-text-muted)]">
        Remove a review only when it breaks the rules: not a genuine experience, abusive, false statements of fact,
        or someone's personal details. A negative opinion is not a reason. Reviews reported by three different people
        are hidden until you decide.
      </p>

      {reviews.length === 0 && (
        <p className="mt-8 rounded-xl border p-8 text-center text-sm text-[var(--ks-text-faint)]" style={{ borderColor: "var(--ks-border)" }}>
          No open reports.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {reviews.map((review) => {
          const labels = new Map(review.questionSet.questions.map((q) => [q.key, q.label]));
          const ownerId = review.property.claimStatus === "VERIFIED" ? review.property.claimedByUserId : null;
          return (
            <article key={review.id} className="rounded-xl border p-5" style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link href={`/property/${review.propertyId}`} className="text-sm font-semibold text-[var(--ks-text)] hover:underline">
                  {review.property.name}
                </Link>
                <span className="text-xs" style={{ color: review.status === "SUSPENDED" ? "var(--ks-danger)" : "var(--ks-text-faint)" }}>
                  {review.status === "SUSPENDED" ? "Hidden until you decide" : "Still visible"}
                </span>
              </div>
              <p className="text-xs text-[var(--ks-text-faint)]">
                Reviewer: {review.user.displayName} ({review.user.primaryEmail}) ·{" "}
                {review.proofs.some((p) => p.status === "APPROVED") ? "proof verified" : "no verified proof"} · posted{" "}
                {review.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
              <ul className="mt-3 flex flex-col gap-1 text-sm">
                {review.reasons.map((r) => (
                  <li key={r.id} className="text-[var(--ks-text-muted)]">
                    <span className="font-semibold">{r.type === "PRO" ? "Pro" : "Con"}</span>{" "}
                    <span className="text-[var(--ks-text-faint)]">{labels.get(r.questionKey) ?? r.questionKey}:</span> {r.text}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-[var(--ks-text-faint)]">
                {review.flags.length} open report{review.flags.length === 1 ? "" : "s"}
              </p>
              <ul className="mt-1 flex flex-col gap-1.5 text-sm">
                {review.flags.map((f) => (
                  <li key={f.id} className="text-[var(--ks-text-muted)]">
                    <span className="font-medium text-[var(--ks-text)]">{FLAG_REASONS[f.reason as FlagReason] ?? f.reason}</span>
                    <span className="text-[var(--ks-text-faint)]">
                      {" "}
                      · {f.flaggedByUser.displayName}
                      {f.flaggedByUserId === ownerId ? " (the business's owner)" : ""}
                    </span>
                    {f.details && <span className="block text-xs">“{f.details}”</span>}
                  </li>
                ))}
              </ul>
              <ReportDecision reviewId={review.id} />
            </article>
          );
        })}
      </div>
    </div>
  );
}
