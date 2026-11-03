import { prisma } from "@/lib/prisma";
import { pendingByJob } from "@/lib/import/review";
import { ImportsTable, type ImportRow } from "./ImportsTable";

const SOURCE_LABELS = { OSM: "OpenStreetMap", OVERTURE: "Overture Maps", MCA: "MCA companies", USER: "Users", ADMIN: "Admin" };

export default async function AdminImportsPage() {
  const jobs = await prisma.importJob.findMany({ orderBy: { startedAt: "desc" }, take: 100 });
  const pending = await prisma.property.groupBy({
    by: ["source"],
    where: { status: "PENDING_VERIFICATION", source: { in: ["OSM", "OVERTURE", "MCA"] } },
    _count: true,
  });
  const pendingCounts = await pendingByJob();
  const rows: ImportRow[] = jobs.map((j) => ({
    id: j.id,
    startedAt: j.startedAt.toISOString(),
    source: SOURCE_LABELS[j.source],
    area: j.area,
    status: j.status,
    created: j.created,
    updated: j.updated,
    merged: j.merged,
    skipped: j.skipped,
    pending: pendingCounts.get(j.id) ?? 0,
  }));

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--ks-text)]">Imports</h1>
      <p className="mt-1 max-w-2xl text-sm text-[var(--ks-text-muted)]">
        Business listings seeded from open data. New listings stay hidden until you publish them: tick batches below
        (or the top box for all of them) and click Publish selected.
        Run an import on the server with <code className="text-xs">npm run import:places</code> (RUNBOOK section 6).
      </p>
      {pending.length > 0 && (
        <p className="mt-3 text-sm text-[var(--ks-text)]">
          Awaiting review: {pending.map((p) => `${p._count} from ${SOURCE_LABELS[p.source]}`).join(", ")}
        </p>
      )}

      <ImportsTable rows={rows} />
    </div>
  );
}
