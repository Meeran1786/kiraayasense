import { getServerSession } from "next-auth";
import { authOptions, isAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { brand } from "@/lib/brand";
import { AdminShell, type AdminCounts } from "@/components/admin/AdminShell";

/**
 * The admin's own app shell: sidebar, top bar, one sign-out. The public site
 * header hides itself under /admin (components/layout/Header.tsx).
 * middleware.ts already keeps non-admins out (except /admin/login, which
 * renders bare here) and keeps moderators out of super-admin sections.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) {
    return <div style={{ background: brand.navy, minHeight: "100vh" }}>{children}</div>;
  }

  const [reviews, reports, replies, claims, banners] = await Promise.all([
    prisma.review.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.review.count({ where: { OR: [{ status: "SUSPENDED" }, { status: "APPROVED", flags: { some: { resolution: "OPEN" } } }] } }),
    prisma.ownerResponse.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.businessClaim.count({ where: { status: "PENDING" } }),
    prisma.adBanner.count({ where: { status: "ACTIVE" } }),
  ]);
  const counts: AdminCounts = { reviews, reports, replies, claims, banners };

  return (
    <AdminShell
      counts={counts}
      user={{ name: session!.user.name ?? "", email: session!.user.email ?? "", role: session!.user.role ?? "MODERATOR" }}
    >
      {children}
    </AdminShell>
  );
}
