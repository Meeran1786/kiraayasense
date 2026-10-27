import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RELATIONSHIP_LABELS, type RelationshipKey } from "@/lib/relationships";
import { PROOF_TYPE_LABELS, type ProofType } from "@/lib/reviewValidation";
import { ModerationActions } from "./ModerationActions";

// Oldest first: the PRD's target is a decision within 48 hours of submission.
export default async function AdminReviewQueuePage() {
  const reviews = await prisma.review.findMany({
    where: { status: "PENDING_REVIEW" },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: {
      property: { include: { category: { include: { parent: true } } } },
      user: true,
      answers: { include: { question: true } },
      reasons: true,
      media: true,
      proofs: true,
      questionSet: { include: { questions: true } },
    },
  });

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--ks-text)]">Reviews awaiting moderation</h1>
      <p className="mt-1 text-sm text-[var(--ks-text-muted)]">
        Read each review in full before deciding. Approving publishes it; a proof you tick earns the review a
        &quot;Proof verified&quot; badge but is never shown publicly. Opening a proof is recorded in the audit log.
      </p>

      {reviews.length === 0 && (
        <p className="mt-8 rounded-xl border p-8 text-center text-sm text-[var(--ks-text-faint)]" style={{ borderColor: "var(--ks-border)" }}>
          Nothing waiting.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-6">
        {reviews.map((review) => {
          const labels = new Map(review.questionSet.questions.map((q) => [q.key, q.label]));
          const sortedAnswers = [...review.answers].sort((a, b) => a.question.sortOrder - b.question.sortOrder);
          const waitingHours = Math.floor((Date.now() - review.createdAt.getTime()) / 3_600_000);
          return (
            <article
              key={review.id}
              className="rounded-xl border p-5"
              style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}
            >
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <Link href={`/property/${review.propertyId}`} className="text-sm font-semibold text-[var(--ks-text)] hover:underline">
                    {review.property.name}
                  </Link>
                  <p className="text-xs text-[var(--ks-text-muted)]">
                    {review.property.category.parent?.name} › {review.property.category.name} ·{" "}
                    {RELATIONSHIP_LABELS[review.relationship as RelationshipKey]}
                  </p>
                </div>
                <p className="text-xs text-[var(--ks-text-faint)]">
                  {review.user.displayName} ({review.user.primaryEmail}){review.isAnonymous && " · posting anonymously"} ·
                  waiting {waitingHours}h
                </p>
              </header>

              <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
                {sortedAnswers.map((a) => (
                  <div key={a.id} className="flex justify-between gap-3">
                    <dt className="text-[var(--ks-text-muted)]">{a.question.label}</dt>
                    <dd className="font-semibold text-[var(--ks-text)]">
                      {a.starValue !== null
                        ? `${a.starValue}/5`
                        : a.boolValue !== null
                        ? a.boolValue
                          ? "Yes"
                          : "No"
                        : a.choiceValue ?? a.numberValue}
                    </dd>
                  </div>
                ))}
              </dl>

              <ul className="mt-4 flex flex-col gap-1.5 text-sm">
                {review.reasons.map((r) => (
                  <li key={r.id} className="text-[var(--ks-text-muted)]">
                    <span className="font-semibold" style={{ color: r.type === "PRO" ? "oklch(70% 0.15 150)" : "oklch(70% 0.17 25)" }}>
                      {r.type === "PRO" ? "Pro" : "Con"}
                    </span>{" "}
                    <span className="text-[var(--ks-text-faint)]">{labels.get(r.questionKey) ?? r.questionKey}:</span> {r.text}
                  </li>
                ))}
              </ul>

              {review.media.length > 0 && (
                <p className="mt-4 flex flex-wrap gap-3 text-xs">
                  {review.media.map((m, i) => (
                    <a key={m.id} href={`/api/admin/files?key=${encodeURIComponent(m.storageKey)}`} target="_blank" className="underline text-[var(--ks-text-muted)]">
                      {m.kind === "VIDEO" ? "Video" : "Photo"} {i + 1}
                    </a>
                  ))}
                </p>
              )}

              <ModerationActions
                reviewId={review.id}
                proofs={review.proofs.map((p) => ({
                  id: p.id,
                  label: PROOF_TYPE_LABELS[p.proofType as ProofType],
                  href: `/api/admin/files?key=${encodeURIComponent(p.storageKey)}`,
                }))}
              />
            </article>
          );
        })}
      </div>
    </div>
  );
}
