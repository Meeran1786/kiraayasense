import Link from "next/link";
import { prisma } from "@/lib/prisma";

const SOURCE_LABELS = { OSM: "OpenStreetMap", OVERTURE: "Overture Maps", MCA: "MCA companies", USER: "Users", ADMIN: "Admin" };

export default async function AdminImportsPage() {
  const jobs = await prisma.importJob.findMany({ orderBy: { startedAt: "desc" }, take: 100 });
  const pending = await prisma.property.groupBy({
    by: ["source"],
    where: { status: "PENDING_VERIFICATION", source: { in: ["OSM", "OVERTURE", "MCA"] } },
    _count: true,
  });

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--ks-text)]">Imports</h1>
      <p className="mt-1 max-w-2xl text-sm text-[var(--ks-text-muted)]">
        Business listings seeded from open data. New listings stay hidden until you spot-check a batch and publish it.
        Run an import on the server with <code className="text-xs">npm run import:places</code> (RUNBOOK section 6).
      </p>
      {pending.length > 0 && (
        <p className="mt-3 text-sm text-[var(--ks-text)]">
          Awaiting review: {pending.map((p) => `${p._count} from ${SOURCE_LABELS[p.source]}`).join(", ")}
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border" style={{ borderColor: "var(--ks-border)" }}>
        <table className="w-full text-left text-sm">
          <thead style={{ background: "var(--ks-bg-elevated)" }}>
            <tr className="text-xs uppercase tracking-wide text-[var(--ks-text-faint)]">
              <th className="px-4 py-2.5">Started</th>
              <th className="px-4 py-2.5">Source</th>
              <th className="px-4 py-2.5">Area</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">New</th>
              <th className="px-4 py-2.5 text-right">Refreshed</th>
              <th className="px-4 py-2.5 text-right">Matched</th>
              <th className="px-4 py-2.5 text-right">Skipped</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-[var(--ks-text-faint)]">
                  No imports yet.
                </td>
              </tr>
            )}
            {jobs.map((j) => (
              <tr key={j.id} className="border-t" style={{ borderColor: "var(--ks-border)" }}>
                <td className="px-4 py-2.5">
                  <Link href={`/admin/imports/${j.id}`} className="text-[var(--ks-text)] hover:underline">
                    {j.startedAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-[var(--ks-text-muted)]">{SOURCE_LABELS[j.source]}</td>
                <td className="px-4 py-2.5 text-[var(--ks-text-muted)]">{j.area}</td>
                <td className="px-4 py-2.5 text-[var(--ks-text-muted)]">{j.status}</td>
                <td className="px-4 py-2.5 text-right text-[var(--ks-text)]">{j.created}</td>
                <td className="px-4 py-2.5 text-right text-[var(--ks-text-muted)]">{j.updated}</td>
                <td className="px-4 py-2.5 text-right text-[var(--ks-text-muted)]">{j.merged}</td>
                <td className="px-4 py-2.5 text-right text-[var(--ks-text-muted)]">{j.skipped}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
