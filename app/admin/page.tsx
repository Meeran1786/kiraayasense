import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const [propertyCount, pendingReviewCount, activeBannerCount, adminCount] = await Promise.all([
    prisma.property.count({ where: { status: "APPROVED" } }),
    prisma.review.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.adBanner.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { role: { in: ["MODERATOR", "SUPER_ADMIN"] } } }),
  ]);

  const cards = [
    { label: "Live businesses", value: propertyCount, href: "/admin/properties" },
    { label: "Reviews awaiting moderation", value: pendingReviewCount, href: "/admin/reviews" },
    { label: "Active banners", value: activeBannerCount, href: "/admin/banners" },
    { label: "Admin/moderator accounts", value: adminCount, href: null },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--ks-text)]">Dashboard</h1>
      <p className="mt-1 text-sm text-[var(--ks-text-muted)]">
        Moderate reviews, manage businesses, categories and question sets, and run promotional banners.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((c) => {
          const Card = (
            <div
              className="rounded-xl border p-4"
              style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}
            >
              <p className="text-2xl font-bold text-[var(--ks-text)]">{c.value}</p>
              <p className="mt-1 text-xs text-[var(--ks-text-muted)]">{c.label}</p>
            </div>
          );
          return c.href ? (
            <Link key={c.label} href={c.href} className="transition-opacity hover:opacity-80">
              {Card}
            </Link>
          ) : (
            <div key={c.label}>{Card}</div>
          );
        })}
      </div>
    </div>
  );
}
