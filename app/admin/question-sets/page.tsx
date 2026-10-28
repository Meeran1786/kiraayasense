import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RELATIONSHIP_LABELS, type RelationshipKey } from "@/lib/relationships";

export default async function AdminQuestionSetsPage() {
  const sets = await prisma.questionSet.findMany({
    where: { isActive: true },
    include: { category: { include: { parent: true } }, _count: { select: { questions: true, reviews: true } } },
  });

  const placeOf = (s: (typeof sets)[number]) =>
    s.category ? (s.category.parent ? `${s.category.parent.name} › ${s.category.name}` : s.category.name) : "";
  // Generic sets first, then by category path, then relationship.
  sets.sort(
    (a, b) =>
      Number(!!a.category) - Number(!!b.category) ||
      placeOf(a).localeCompare(placeOf(b)) ||
      a.relationship.localeCompare(b.relationship)
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--ks-text)]">Question sets</h1>
        <Link
          href="/admin/question-sets/new"
          className="rounded-full px-4 py-1.5 text-xs font-bold text-slate-950"
          style={{ background: "linear-gradient(90deg, var(--ks-coral), var(--ks-magenta))" }}
        >
          + New set
        </Link>
      </div>
      <p className="mt-1 text-sm text-[var(--ks-text-muted)]">
        A review uses the most specific set: the sub-category&apos;s own, then its category&apos;s, then the generic set
        for the reviewer&apos;s relationship. Saving a set publishes a new version; earlier reviews keep the version they
        answered.
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border" style={{ borderColor: "var(--ks-border)" }}>
        <table className="w-full text-left text-sm">
          <thead style={{ background: "var(--ks-bg-elevated)" }}>
            <tr className="text-xs uppercase tracking-wide text-[var(--ks-text-faint)]">
              <th className="px-4 py-2.5">Applies to</th>
              <th className="px-4 py-2.5">Reviewer</th>
              <th className="px-4 py-2.5">Title</th>
              <th className="px-4 py-2.5">Version</th>
              <th className="px-4 py-2.5">Questions</th>
              <th className="px-4 py-2.5">Reviews</th>
            </tr>
          </thead>
          <tbody>
            {sets.map((s) => (
              <tr key={s.id} className="border-t" style={{ borderColor: "var(--ks-border)" }}>
                <td className="px-4 py-2.5 text-[var(--ks-text-muted)]">
                  {s.category ? placeOf(s) : <em>All categories (generic)</em>}
                </td>
                <td className="px-4 py-2.5 text-[var(--ks-text-muted)]">
                  {RELATIONSHIP_LABELS[s.relationship as RelationshipKey]}
                </td>
                <td className="px-4 py-2.5 text-[var(--ks-text)]">
                  <Link href={`/admin/question-sets/${s.id}`} className="hover:underline">
                    {s.title}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-[var(--ks-text-faint)]">v{s.version}</td>
                <td className="px-4 py-2.5 text-[var(--ks-text-faint)]">{s._count.questions}</td>
                <td className="px-4 py-2.5 text-[var(--ks-text-faint)]">{s._count.reviews}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
