import Link from "next/link";
import { getServerSession } from "next-auth";
import { AlertTriangle, ClipboardCheck, Flag, MessageSquareReply, BadgeCheck, Store, Users, Star, ArrowRight } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const day = 24 * 60 * 60 * 1000;
const fmt = (d: Date) => d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
const human = (action: string) => action.charAt(0) + action.slice(1).toLowerCase().replace(/_/g, " ");

export default async function AdminDashboardPage({ searchParams }: { searchParams: { denied?: string } }) {
  const session = await getServerSession(authOptions);
  const isSuper = session?.user?.role === "SUPER_ADMIN";
  const since = new Date(Date.now() - 7 * day);

  const [pendingReviews, reported, pendingReplies, pendingClaims, liveBusinesses, newBusinesses, newReviews, newUsers, recent] =
    await Promise.all([
      prisma.review.count({ where: { status: "PENDING_REVIEW" } }),
      prisma.review.count({ where: { OR: [{ status: "SUSPENDED" }, { status: "APPROVED", flags: { some: { resolution: "OPEN" } } }] } }),
      prisma.ownerResponse.count({ where: { status: "PENDING_REVIEW" } }),
      prisma.businessClaim.count({ where: { status: "PENDING" } }),
      prisma.property.count({ where: { status: "APPROVED" } }),
      prisma.property.count({ where: { source: "USER", createdAt: { gte: since } } }),
      prisma.review.count({ where: { createdAt: { gte: since } } }),
      prisma.user.count({ where: { createdAt: { gte: since } } }),
      isSuper
        ? prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { actor: { select: { displayName: true } } } })
        : Promise.resolve([]),
    ]);

  const attention = [
    { label: "Reviews to moderate", value: pendingReviews, href: "/admin/reviews", icon: ClipboardCheck },
    { label: "Reported reviews", value: reported, href: "/admin/reports", icon: Flag },
    { label: "Owner replies to check", value: pendingReplies, href: "/admin/replies", icon: MessageSquareReply },
    { label: "Ownership claims", value: pendingClaims, href: "/admin/claims", icon: BadgeCheck },
  ];
  const week = [
    { label: "Live businesses", value: liveBusinesses, icon: Store },
    { label: "Businesses added by users", value: newBusinesses, icon: Store },
    { label: "Reviews submitted", value: newReviews, icon: Star },
    { label: "New sign-ups", value: newUsers, icon: Users },
  ];
  const waiting = attention.reduce((n, a) => n + a.value, 0);
  const card = { borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" };

  return (
    <div className="flex flex-col gap-6">
      {searchParams.denied && (
        <p className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--ks-coral)", color: "var(--ks-text)" }}>
          <AlertTriangle size={15} style={{ color: "var(--ks-coral)" }} />
          That page is for super admins only. Ask a super admin if you need access.
        </p>
      )}
      <div>
        <h1 className="text-xl font-bold text-[var(--ks-text)]">Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--ks-text-muted)]">
          {waiting === 0 ? "Nothing is waiting for you. Nice work." : `${waiting} item${waiting === 1 ? "" : "s"} need${waiting === 1 ? "s" : ""} attention.`}
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ks-text-faint)]">Needs attention</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {attention.map((a) => (
            <Link key={a.href} href={a.href} className="group rounded-xl border p-4 transition-opacity hover:opacity-90" style={card}>
              <div className="flex items-center justify-between">
                <a.icon size={18} className="text-[var(--ks-text-muted)]" />
                {a.value > 0 && <span className="h-2 w-2 rounded-full" style={{ background: "var(--ks-coral)" }} />}
              </div>
              <p className="mt-3 text-2xl font-bold text-[var(--ks-text)]">{a.value}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--ks-text-muted)]">
                {a.label} <ArrowRight size={12} className="opacity-0 transition-opacity group-hover:opacity-100" />
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ks-text-faint)]">Last 7 days</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {week.map((w) => (
            <div key={w.label} className="rounded-xl border p-4" style={card}>
              <w.icon size={18} className="text-[var(--ks-text-muted)]" />
              <p className="mt-3 text-2xl font-bold text-[var(--ks-text)]">{w.value.toLocaleString("en-IN")}</p>
              <p className="mt-0.5 text-xs text-[var(--ks-text-muted)]">{w.label}</p>
            </div>
          ))}
        </div>
      </section>

      {isSuper && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--ks-text-faint)]">Recent activity</h2>
            <Link href="/admin/activity" className="text-xs text-[var(--ks-text-muted)] hover:underline">See all</Link>
          </div>
          <div className="rounded-xl border" style={card}>
            {recent.length === 0 ? (
              <p className="p-4 text-sm text-[var(--ks-text-muted)]">No admin activity yet.</p>
            ) : (
              recent.map((r, i) => (
                <div key={r.id} className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm ${i ? "border-t" : ""}`} style={{ borderColor: "var(--ks-border-soft)" }}>
                  <span className="text-[var(--ks-text)]">
                    <b>{r.actor?.displayName ?? "System"}</b> <span className="text-[var(--ks-text-muted)]">{human(r.action).toLowerCase()}</span>
                  </span>
                  <span className="shrink-0 text-xs text-[var(--ks-text-faint)]">{fmt(r.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
