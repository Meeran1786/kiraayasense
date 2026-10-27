import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BannerRowActions } from "./BannerRowActions";

export default async function AdminBannersPage() {
  const banners = await prisma.adBanner.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--ks-text)]">Banners</h1>
        <Link
          href="/admin/banners/new"
          className="rounded-full px-4 py-1.5 text-xs font-bold text-slate-950"
          style={{ background: "linear-gradient(90deg, var(--ks-coral), var(--ks-magenta))" }}
        >
          + New banner
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border" style={{ borderColor: "var(--ks-border)" }}>
        <table className="w-full text-left text-sm">
          <thead style={{ background: "var(--ks-bg-elevated)" }}>
            <tr className="text-xs uppercase tracking-wide text-[var(--ks-text-faint)]">
              <th className="px-4 py-2.5">Title</th>
              <th className="px-4 py-2.5">Placement</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Advertiser</th>
              <th className="px-4 py-2.5">Runs</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {banners.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--ks-text-faint)]">
                  No banners yet.
                </td>
              </tr>
            )}
            {banners.map((b) => (
              <tr key={b.id} className="border-t" style={{ borderColor: "var(--ks-border)" }}>
                <td className="px-4 py-2.5 text-[var(--ks-text)]">
                  <Link href={`/admin/banners/${b.id}`} className="hover:underline">
                    {b.title}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-[var(--ks-text-muted)]">{b.placement}</td>
                <td className="px-4 py-2.5 text-[var(--ks-text-muted)]">{b.status}</td>
                <td className="px-4 py-2.5 text-[var(--ks-text-muted)]">{b.advertiserName}</td>
                <td className="px-4 py-2.5 text-[var(--ks-text-faint)]">
                  {b.startAt.toISOString().slice(0, 10)} → {b.endAt.toISOString().slice(0, 10)}
                </td>
                <td className="px-4 py-2.5">
                  <BannerRowActions bannerId={b.id} status={b.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
