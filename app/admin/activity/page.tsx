import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Activity log — KiraayaSense admin" };

const PAGE = 50;
const fmt = (d: Date) => d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
const human = (action: string) => action.charAt(0) + action.slice(1).toLowerCase().replace(/_/g, " ");

/** Every admin action recorded in audit_logs, newest first, filterable by person, action and date. */
export default async function ActivityPage({
  searchParams,
}: {
  searchParams: { actor?: string; action?: string; from?: string; to?: string; page?: string };
}) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const where = {
    ...(searchParams.actor ? { actorUserId: searchParams.actor } : {}),
    ...(searchParams.action ? { action: searchParams.action } : {}),
    ...(searchParams.from || searchParams.to
      ? {
          createdAt: {
            ...(searchParams.from ? { gte: new Date(`${searchParams.from}T00:00:00+05:30`) } : {}),
            ...(searchParams.to ? { lte: new Date(`${searchParams.to}T23:59:59.999+05:30`) } : {}),
          },
        }
      : {}),
  };
  const [rows, total, actions, actors] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
      include: { actor: { select: { displayName: true, primaryEmail: true } } },
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({ by: ["action"], orderBy: { action: "asc" } }),
    prisma.user.findMany({ where: { auditLogEntries: { some: {} } }, select: { id: true, displayName: true }, orderBy: { displayName: "asc" } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const qs = (p: number) => {
    const sp = new URLSearchParams(Object.entries(searchParams).filter(([k, v]) => k !== "page" && v) as [string, string][]);
    sp.set("page", String(p));
    return `/admin/activity?${sp.toString()}`;
  };
  const inputCls = "rounded-lg border border-[var(--ks-border-strong)] bg-transparent px-2.5 py-1.5 text-sm text-[var(--ks-text)]";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--ks-text)]">Activity log</h1>
        <p className="mt-1 text-sm text-[var(--ks-text-muted)]">
          Who did what in the admin, and when. Kept permanently, including for takedown and grievance records.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-2 text-xs text-[var(--ks-text-muted)]">
        <label className="flex flex-col gap-1">
          Person
          <select name="actor" defaultValue={searchParams.actor ?? ""} className={inputCls}>
            <option value="">Everyone</option>
            {actors.map((a) => (
              <option key={a.id} value={a.id}>{a.displayName}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Action
          <select name="action" defaultValue={searchParams.action ?? ""} className={inputCls}>
            <option value="">All actions</option>
            {actions.map((a) => (
              <option key={a.action} value={a.action}>{human(a.action)}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          From
          <input type="date" name="from" defaultValue={searchParams.from} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1">
          To
          <input type="date" name="to" defaultValue={searchParams.to} className={inputCls} />
        </label>
        <button type="submit" className="rounded-lg border px-3 py-1.5 text-sm text-[var(--ks-text)] hover:bg-white/5" style={{ borderColor: "var(--ks-border-strong)" }}>
          Filter
        </button>
        <Link href="/admin/activity" className="px-2 py-1.5 underline">Clear</Link>
        <span className="ms-auto">{total.toLocaleString("en-IN")} entries</span>
      </form>

      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--ks-border)" }}>
        <table className="w-full text-left text-sm">
          <thead style={{ background: "var(--ks-bg-elevated)" }}>
            <tr className="text-xs uppercase tracking-wide text-[var(--ks-text-faint)]">
              <th className="px-4 py-2.5">When (IST)</th>
              <th className="px-4 py-2.5">Who</th>
              <th className="px-4 py-2.5">Action</th>
              <th className="px-4 py-2.5">On</th>
              <th className="px-4 py-2.5">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--ks-text-faint)]">Nothing matches these filters.</td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t align-top" style={{ borderColor: "var(--ks-border)" }}>
                <td className="whitespace-nowrap px-4 py-2 text-xs text-[var(--ks-text-faint)]">{fmt(r.createdAt)}</td>
                <td className="px-4 py-2 text-[var(--ks-text)]">{r.actor.displayName}</td>
                <td className="px-4 py-2 text-[var(--ks-text-muted)]">{human(r.action)}</td>
                <td className="px-4 py-2 text-xs text-[var(--ks-text-muted)]">
                  {r.entityType === "Property" ? (
                    <Link href={`/property/${r.entityId}`} className="underline">Business</Link>
                  ) : (
                    r.entityType
                  )}{" "}
                  <span className="text-[var(--ks-text-faint)]">{r.entityId.slice(0, 8)}</span>
                </td>
                <td className="max-w-xs px-4 py-2 text-xs text-[var(--ks-text-faint)]">
                  {r.metadata ? <code className="line-clamp-2 break-all">{JSON.stringify(r.metadata)}</code> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-[var(--ks-text-muted)]">
          {page > 1 ? <Link href={qs(page - 1)} className="underline">← Newer</Link> : <span />}
          <span>Page {page} of {pages}</span>
          {page < pages ? <Link href={qs(page + 1)} className="underline">Older →</Link> : <span />}
        </div>
      )}
    </div>
  );
}
