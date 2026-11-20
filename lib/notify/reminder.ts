import "server-only";
import { prisma } from "@/lib/prisma";
import { istDayKey, POINTS } from "@/lib/rewards";
import { channelPrefs } from "./types";
import { pushConfigured, sendPush } from "./push";

/**
 * The 7 PM IST run (deploy/daily-reminder.sh → POST /api/cron/daily-reminder):
 * a push to everyone with notifications on who hasn't opened the app today,
 * so they don't miss their daily point. Push only (no email, WhatsApp or bell
 * entry), and each person can switch it off in Profile → Alerts.
 */
export async function runDailyPointReminder(now = new Date()) {
  if (!pushConfigured()) return { reminded: 0, skipped: "push not configured" };
  const day = istDayKey(now);
  const users = await prisma.user.findMany({
    where: { status: "ACTIVE", pushSubscriptions: { some: {} } },
    select: { id: true, notificationPrefs: true },
  });
  let reminded = 0;
  for (const u of users) {
    if (!channelPrefs(u.notificationPrefs, "DAILY_POINT_REMINDER").push) continue;
    const got = await prisma.pointEvent.findUnique({ where: { dedupeKey: `DAILY_OPEN:${u.id}:${day}` }, select: { id: true } });
    if (got) continue;
    const sent = await sendPush(u.id, {
      title: "You're missing out on your point today",
      body: `Open KiraayaSense before midnight to collect today's ${POINTS.DAILY_OPEN} point.`,
      link: "/profile/rewards",
      tag: "DAILY_POINT_REMINDER",
    });
    if (sent) reminded++;
  }
  return { reminded };
}
