import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BatchActions } from "./BatchActions";

const SAMPLE_SIZE = 25;

export default async function AdminImportJobPage({ params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const job = await prisma.importJob.findUnique({ where: { id: params.id } });
  if (!job) notFound();

  const createdIds = (
    await prisma.importRecord.findMany({
      where: { jobId: job.id, action: "CREATED", propertyId: { not: null } },
      select: { propertyId: true },
    })
  ).map((r) => r.propertyId!);

  const pending = await prisma.property.count({ where: { id: { in: createdIds }, status: "PENDING_VERIFICATION" } });

  // A random sample is what a spot-check should look at, not the first rows.
  const sampleIds = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM properties WHERE id = ANY(${createdIds}::uuid[]) ORDER BY random() LIMIT ${SAMPLE_SIZE}`;
  const sample = await prisma.property.findMany({
    where: { id: { in: sampleIds.map((s) => s.id) } },
    include: { locality: true, category: { include: { parent: true } } },
  });
  const matched = await prisma.importRecord.findMany({
    where: { jobId: job.id, action: { in: ["MERGED", "SKIPPED"] } },
    include: { property: { select: { id: true, name: true } } },
    take: 50,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/imports" className="text-xs text-[var(--ks-text-muted)] hover:underline">
          ← Imports
        </Link>
        <h1 className="mt-1 text-xl font-bold text-[var(--ks-text)]">
          {job.source} import, {job.area}
        </h1>
        <p className="mt-1 text-sm text-[var(--ks-text-muted)]">
          {job.created} new · {job.updated} refreshed · {job.merged} matched existing listings · {job.skipped} skipped
          {job.error && <span className="block text-red-400">Failed: {job.error}</span>}
        </p>
      </div>

      <BatchActions jobId={job.id} pending={pending} />

      <section>
        <h2 className="mb-2 text-sm font-semibold text-[var(--ks-text)]">
          Random sample of new listings ({sample.length} of {createdIds.length})
        </h2>
        <p className="mb-3 text-xs text-[var(--ks-text-faint)]">
          Check names, categories and localities. Fix one by opening it; if many are wrong, reject the batch and adjust the
          category mapping in <code>lib/import/sources</code>.
        </p>
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--ks-border)" }}>
          <table className="w-full text-left text-sm">
            <tbody>
              {sample.map((p) => (
                <tr key={p.id} className="border-t first:border-t-0" style={{ borderColor: "var(--ks-border)" }}>
                  <td className="px-4 py-2">
                    <Link href={`/admin/properties/${p.id}`} className="text-[var(--ks-text)] hover:underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-[var(--ks-text-muted)]">
                    {p.category.parent?.name} › {p.category.name}
                  </td>
                  <td className="px-4 py-2 text-[var(--ks-text-muted)]">
                    {p.locality.name}
                    {p.pincode ? ` · ${p.pincode}` : ""}
                  </td>
                  <td className="px-4 py-2 text-xs text-[var(--ks-text-faint)]">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {matched.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-[var(--ks-text)]">Matched or skipped (first 50)</h2>
          <ul className="flex flex-col gap-1 text-xs text-[var(--ks-text-muted)]">
            {matched.map((r) => (
              <li key={r.id}>
                <span className="text-[var(--ks-text)]">{r.name}</span> — {r.action.toLowerCase()}
                {r.reason ? `: ${r.reason}` : ""}
                {r.property && (
                  <>
                    {" "}
                    (<Link href={`/admin/properties/${r.property.id}`} className="underline">
                      open
                    </Link>
                    )
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
