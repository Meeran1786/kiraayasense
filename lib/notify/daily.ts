import "server-only";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES } from "@/lib/auth";
import { SITE_URL } from "@/lib/site";
import { formatRupees } from "@/lib/rewards";
import { recipientSelect, deliverNow, plan } from "./index";
import { sendEmail } from "./email";
import { sendTemplate } from "./whatsapp";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The 9 AM IST run (deploy/daily-alerts.sh → POST /api/cron/daily-alerts):
 *  1. the admin summary,
 *  2. one "people found your reviews helpful" message per reviewer,
 *  3. "points credited" for points whose 30-day hold ended in the last day.
 */
export async function runDailyAlerts(now = new Date()) {
  const since = new Date(now.getTime() - DAY_MS);
  const result = { adminSummaries: 0, helpfulDigests: 0, pointsAlerts: 0 };

  // 1. Admin summary
  const [pendingReviews, openReports, pendingClaims, pendingReplies, newReviews, newBusinesses, newUsers] = await Promise.all([
    prisma.review.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.review.count({ where: { OR: [{ status: "SUSPENDED" }, { status: "APPROVED", flags: { some: { resolution: "OPEN" } } }] } }),
    prisma.businessClaim.count({ where: { status: "PENDING" } }),
    prisma.ownerResponse.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.review.count({ where: { createdAt: { gte: since } } }),
    prisma.property.count({ where: { createdAt: { gte: since }, source: "USER" } }),
    prisma.user.count({ where: { createdAt: { gte: since } } }),
  ]);
  const admins = await prisma.user.findMany({
    where: { role: { in: [...ADMIN_ROLES] }, status: "ACTIVE" },
    select: { id: true },
  });
  if (admins.length) {
    const body =
      `Waiting: ${pendingReviews} reviews, ${openReports} reports, ${pendingClaims} claims, ${pendingReplies} owner replies.\n` +
      `New in the last 24 hours: ${newReviews} reviews, ${newBusinesses} businesses added by users, ${newUsers} new users.`;
    await deliverNow(
      admins.map((a) => a.id),
      {
        type: "ADMIN_DIGEST",
        title: "KiraayaSense daily summary",
        body,
        link: "/admin",
        whatsapp: {
          name: "ks_admin_daily",
          params: [
            String(pendingReviews),
            String(openReports),
            String(pendingClaims),
            String(pendingReplies),
            String(newReviews),
            String(newBusinesses),
            `${SITE_URL}/admin`,
          ],
        },
      }
    );
    result.adminSummaries = admins.length;
  }

  // 2. Helpful digest: the day's HELPFUL bell entries left PENDING per channel
  const pending = await prisma.notification.findMany({
    where: { type: "HELPFUL", OR: [{ emailStatus: "PENDING" }, { whatsappStatus: "PENDING" }] },
    select: { id: true, userId: true, emailStatus: true, whatsappStatus: true },
  });
  const byUser = new Map<string, typeof pending>();
  for (const n of pending) byUser.set(n.userId, [...(byUser.get(n.userId) ?? []), n]);
  for (const [userId, rows] of Array.from(byUser.entries())) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { ...recipientSelect, handle: true } });
    if (!user) continue;
    // Count real votes, not bell entries (one entry can stand for several votes).
    const n = await prisma.helpfulVote.count({ where: { review: { userId }, createdAt: { gt: since } } });
    const link = user.handle ? `/u/${user.handle}` : "/profile";
    const text = `${n} ${n === 1 ? "person" : "people"} marked your reviews as helpful since yesterday. Each helpful vote earns you a point.`;
    const p = plan(user, "HELPFUL");
    let emailOk: boolean | null = null;
    let waOk: boolean | null = null;
    if (n > 0 && rows.some((r) => r.emailStatus === "PENDING") && p.email !== "SKIP" && user.primaryEmail)
      emailOk = await sendEmail(user.primaryEmail, "Your reviews are helping people", text, link);
    if (n > 0 && rows.some((r) => r.whatsappStatus === "PENDING") && p.whatsapp !== "SKIP" && user.primaryPhone)
      waOk = await sendTemplate(user.primaryPhone, { name: "ks_helpful_digest", params: [String(n), `${SITE_URL}${link}`] });
    const ids = rows.map((r) => r.id);
    await prisma.notification.updateMany({
      where: { id: { in: ids }, emailStatus: "PENDING" },
      data: { emailStatus: emailOk === null ? "SKIPPED" : emailOk ? "SENT" : "FAILED" },
    });
    await prisma.notification.updateMany({
      where: { id: { in: ids }, whatsappStatus: "PENDING" },
      data: { whatsappStatus: waOk === null ? "SKIPPED" : waOk ? "SENT" : "FAILED" },
    });
    result.helpfulDigests++;
  }

  // 3. Points that finished their 30-day hold in the last day
  const cleared = await prisma.pointEvent.groupBy({
    by: ["userId"],
    where: { availableAt: { gt: since, lte: now }, review: { status: "APPROVED" } },
    _sum: { points: true },
  });
  for (const row of cleared) {
    const points = row._sum.points ?? 0;
    if (points <= 0) continue;
    await deliverNow([row.userId], {
      type: "POINTS_CREDITED",
      title: `${points} points are now yours`,
      body: `${points} KiraayaSense points (worth ${formatRupees(points)}) finished their 30-day hold and are now available in your rewards.`,
      link: "/profile/rewards",
      whatsapp: { name: "ks_points_credited", params: [String(points), `${SITE_URL}/profile/rewards`] },
    });
    result.pointsAlerts++;
  }

  return result;
}
