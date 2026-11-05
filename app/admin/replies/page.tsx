import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ReplyDecision } from "./ReplyDecision";

// Oldest first, like the review queue.
export default async function AdminRepliesPage() {
  const replies = await prisma.ownerResponse.findMany({
    where: { status: "PENDING_REVIEW" },
    orderBy: { updatedAt: "asc" },
    take: 50,
    include: {
      respondedByUser: true,
      review: { include: { property: true, reasons: true, questionSet: { include: { questions: true } } } },
    },
  });

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--ks-text)]">Owner replies</h1>
      <p className="mt-1 max-w-2xl text-sm text-[var(--ks-text-muted)]">
        Publish replies that answer the review. Reject replies that threaten or insult the reviewer, reveal their
        identity or personal details, or offer them anything to change the review.
      </p>

      {replies.length === 0 && (
        <p className="mt-8 rounded-xl border p-8 text-center text-sm text-[var(--ks-text-faint)]" style={{ borderColor: "var(--ks-border)" }}>
          Nothing waiting.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {replies.map((reply) => {
          const labels = new Map(reply.review.questionSet.questions.map((q) => [q.key, q.label]));
          return (
            <article key={reply.id} className="rounded-xl border p-5" style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link href={`/property/${reply.review.propertyId}`} className="text-sm font-semibold text-[var(--ks-text)] hover:underline">
                  {reply.review.property.name}
                </Link>
                <span className="text-xs text-[var(--ks-text-faint)]">
                  by {reply.respondedByUser.displayName} ({reply.respondedByUser.primaryEmail})
                </span>
              </div>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--ks-text-faint)]">The review</p>
              <ul className="mt-1 flex flex-col gap-1 text-sm">
                {reply.review.reasons.map((r) => (
                  <li key={r.id} className="text-[var(--ks-text-muted)]">
                    <span className="font-semibold">{r.type === "PRO" ? "Pro" : "Con"}</span>{" "}
                    <span className="text-[var(--ks-text-faint)]">{labels.get(r.questionKey) ?? r.questionKey}:</span> {r.text}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--ks-text-faint)]">Owner's reply</p>
              <p className="mt-1 whitespace-pre-line rounded-lg border-l-2 px-3 py-2 text-sm text-[var(--ks-text)]" style={{ borderColor: "var(--ks-coral)" }}>
                {reply.text}
              </p>
              <ReplyDecision replyId={reply.id} />
            </article>
          );
        })}
      </div>
    </div>
  );
}
