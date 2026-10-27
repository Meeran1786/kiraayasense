import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminPropertiesPage() {
  const properties = await prisma.property.findMany({
    include: { locality: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--ks-text)]">Properties</h1>
      <p className="mt-1 text-sm text-[var(--ks-text-muted)]">
        Fix a listing's name, category, address, or rent range, or take it down.
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border" style={{ borderColor: "var(--ks-border)" }}>
        <table className="w-full text-left text-sm">
          <thead style={{ background: "var(--ks-bg-elevated)" }}>
            <tr className="text-xs uppercase tracking-wide text-[var(--ks-text-faint)]">
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Category</th>
              <th className="px-4 py-2.5">Locality</th>
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
                <td className="px-4 py-2.5 text-[var(--ks-text-muted)]">{p.category}</td>
                <td className="px-4 py-2.5 text-[var(--ks-text-muted)]">{p.locality.name}</td>
                <td className="px-4 py-2.5 text-[var(--ks-text-muted)]">{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
