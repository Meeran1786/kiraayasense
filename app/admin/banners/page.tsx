import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { bannerImageUrl, HOME_BANNER_LIMIT, istDate } from "@/lib/banners";
import { BannerRowActions } from "./BannerRowActions";

export default async function AdminBannersPage() {
  const banners = await prisma.adBanner.findMany({
    orderBy: [{ placement: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const events = banners.length
    ? await prisma.bannerEvent.groupBy({
        by: ["bannerId", "eventType"],
        where: { bannerId: { in: banners.map((b) => b.id) } },
        _count: true,
      })
    : [];
  const count = (id: string, type: "IMPRESSION" | "CLICK") =>
    events.find((e) => e.bannerId === id && e.eventType === type)?._count ?? 0;

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
      <p className="mt-2 text-xs text-[var(--ks-text-muted)]">
        The home page carousel shows up to {HOME_BANNER_LIMIT} banners with placement “Home page carousel”, status Active and
        today inside their run dates, lowest position first. Images: 1600 × 400 px (4:1).
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border" style={{ borderColor: "var(--ks-border)" }}>
        <table className="w-full text-left text-sm">
          <thead style={{ background: "var(--ks-bg-elevated)" }}>
            <tr className="text-xs uppercase tracking-wide text-[var(--ks-text-faint)]">
              <th className="px-4 py-2.5">#</th>
              <th className="px-4 py-2.5">Banner</th>
              <th className="px-4 py-2.5">Placement</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Advertiser</th>
              <th className="px-4 py-2.5">Runs</th>
              <th className="px-4 py-2.5">Views / clicks</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {banners.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[var(--ks-text-faint)]">
                  No banners yet.
                </td>
              </tr>
            )}
            {banners.map((b) => (
              <tr key={b.id} className="border-t" style={{ borderColor: "var(--ks-border)" }}>
                <td className="px-4 py-2.5 text-[var(--ks-text-muted)]">{b.sortOrder}</td>
                <td className="px-4 py-2.5 text-[var(--ks-text)]">
                  <Link href={`/admin/banners/${b.id}`} className="flex items-center gap-3 hover:underline">
                    {bannerImageUrl(b.imageStorageKey) ? (
                      // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail
                      <img src={bannerImageUrl(b.imageStorageKey)!} alt="" className="h-8 w-32 shrink-0 rounded object-cover" />
                    ) : (
                      <span className="w-32 shrink-0 text-[11px] text-red-400">Image not usable</span>
                    )}
                    {b.title}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-[var(--ks-text-muted)]">{b.placement === "HOME_HERO" ? "Home carousel" : b.placement}</td>
                <td className="px-4 py-2.5 text-[var(--ks-text-muted)]">{b.status}</td>
                <td className="px-4 py-2.5 text-[var(--ks-text-muted)]">{b.advertiserName}</td>
                <td className="px-4 py-2.5 text-[var(--ks-text-faint)]">
                  {istDate(b.startAt)} → {istDate(b.endAt)}
                </td>
                <td className="px-4 py-2.5 text-[var(--ks-text-faint)]">
                  {count(b.id, "IMPRESSION").toLocaleString("en-IN")} / {count(b.id, "CLICK").toLocaleString("en-IN")}
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
