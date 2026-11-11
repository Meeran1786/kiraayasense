import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Search — KiraayaSense admin" };

/** Admin quick search: businesses by name or PIN, people by name, email or handle. */
export default async function AdminSearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? "").trim().slice(0, 100);
  const [businesses, people] = q
    ? await Promise.all([
        prisma.property.findMany({
          where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { pincode: q }] },
          take: 25,
          orderBy: { name: "asc" },
          select: { id: true, name: true, status: true, district: true, locality: { select: { name: true } } },
        }),
        prisma.user.findMany({
          where: {
            OR: [
              { displayName: { contains: q, mode: "insensitive" } },
              { primaryEmail: { contains: q, mode: "insensitive" } },
              { handle: { contains: q.toLowerCase() } },
            ],
          },
          take: 25,
          select: { id: true, displayName: true, primaryEmail: true, handle: true, role: true, _count: { select: { reviews: true } } },
        }),
      ])
    : [[], []];

  const card = { borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" };
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-[var(--ks-text)]">{q ? `Results for “${q}”` : "Search"}</h1>
      <section>
        <h2 className="text-sm font-semibold text-[var(--ks-text-muted)]">Businesses ({businesses.length})</h2>
        <ul className="mt-2 divide-y rounded-xl border" style={card}>
          {businesses.length === 0 && <li className="px-4 py-3 text-sm text-[var(--ks-text-faint)]">No businesses found.</li>}
          {businesses.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm" style={{ borderColor: "var(--ks-border)" }}>
              <Link href={`/admin/properties/${b.id}`} className="font-medium text-[var(--ks-text)] hover:underline">{b.name}</Link>
              <span className="text-xs text-[var(--ks-text-faint)]">{b.locality.name}, {b.district} · {b.status}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-sm font-semibold text-[var(--ks-text-muted)]">People ({people.length})</h2>
        <ul className="mt-2 divide-y rounded-xl border" style={card}>
          {people.length === 0 && <li className="px-4 py-3 text-sm text-[var(--ks-text-faint)]">No people found.</li>}
          {people.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm" style={{ borderColor: "var(--ks-border)" }}>
              <span>
                {p.handle ? <Link href={`/u/${p.handle}`} className="font-medium text-[var(--ks-text)] hover:underline">{p.displayName}</Link> : p.displayName}
                <span className="ms-2 text-xs text-[var(--ks-text-muted)]">{p.primaryEmail}</span>
              </span>
              <span className="text-xs text-[var(--ks-text-faint)]">{p._count.reviews} reviews · {p.role}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
