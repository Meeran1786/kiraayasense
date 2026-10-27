import Link from "next/link";
import type { Prisma, PropertyStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const STATUSES: PropertyStatus[] = ["PENDING_VERIFICATION", "APPROVED", "REJECTED", "MERGED", "UNPUBLISHED"];
const PAGE_SIZE = 100;

export default async function AdminPropertiesPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string; source?: string };
}) {
  const status = STATUSES.find((s) => s === searchParams.status);
  const q = searchParams.q?.trim();
  const where: Prisma.PropertyWhereInput = {
    ...(status ? { status } : {}),
    ...(searchParams.source === "USER" ? { source: "USER" } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { pincode: q }] } : {}),
  };
  const [properties, total, pendingUser] = await Promise.all([
    prisma.property.findMany({
      where,
      include: { locality: true, category: { include: { parent: true } } },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
    }),
    prisma.property.count({ where }),
    prisma.property.count({ where: { status: "PENDING_VERIFICATION", source: "USER" } }),
  ]);

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--ks-text)]">Businesses</h1>
      <p className="mt-1 text-sm text-[var(--ks-text-muted)]">
        Fix a listing's name, category, address, or rent range, approve one a user added, or take it down.
      </p>
      {pendingUser > 0 && (
        <p className="mt-3 text-sm">
          <Link href="/admin/properties?status=PENDING_VERIFICATION&source=USER" className="font-semibold text-[var(--ks-text)] underline">
            {pendingUser} business{pendingUser === 1 ? "" : "es"} added by users awaiting approval
          </Link>
        </p>
      )}

      <form className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <input
          name="q"
          defaultValue={q}
          placeholder="Name or pincode"
          className="rounded-lg border border-[var(--ks-border-strong)] bg-transparent px-3 py-1.5 text-[var(--ks-text)]"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-lg border border-[var(--ks-border-strong)] bg-transparent px-3 py-1.5 text-[var(--ks-text)]"
        >
          <option value="">Any status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg border border-[var(--ks-border-strong)] px-3 py-1.5 text-[var(--ks-text)]">
          Filter
        </button>
        <span className="text-xs text-[var(--ks-text-faint)]">
          {total > PAGE_SIZE ? `Showing the newest ${PAGE_SIZE} of ${total}` : `${total} listings`}
        </span>
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border" style={{ borderColor: "var(--ks-border)" }}>
        <table className="w-full text-left text-sm">
          <thead style={{ background: "var(--ks-bg-elevated)" }}>
            <tr className="text-xs uppercase tracking-wide text-[var(--ks-text-faint)]">
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Category</th>
              <th className="px-4 py-2.5">Locality</th>
              <th className="px-4 py-2.5">Source</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((p) => (
              <tr key={p.id} className="border-t" style={{ borderColor: "var(--ks-border)" }}>
                <td className="px-4 py-2.5 text-[var(--ks-text)]">
                  <Link href={`/admin/properties/${p.id}`} className="hover:underline">
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-[var(--ks-text-muted)]">
                  {p.category.parent ? `${p.category.parent.name} · ` : ""}
                  {p.category.name}
                </td>
                <td className="px-4 py-2.5 text-[var(--ks-text-muted)]">{p.locality.name}</td>
                <td className="px-4 py-2.5 text-[var(--ks-text-muted)]">{p.source}</td>
                <td className="px-4 py-2.5 text-[var(--ks-text-muted)]">{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
