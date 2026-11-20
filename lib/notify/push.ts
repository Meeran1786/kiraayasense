import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";

/**
 * Web push (browser and installed-app notifications), with VAPID keys from
 * .env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and optionally VAPID_SUBJECT
 * (defaults to the site URL). deploy/deploy.sh creates the keys once if they
 * are missing. Without keys, nothing is sent and the "Turn on notifications"
 * prompt stays hidden.
 *
 * Works in Chrome, Edge and Firefox on Android and desktop, and on iPhone
 * (iOS 16.4+) once the site is added to the home screen.
 */
export const pushConfigured = () => !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
export const vapidPublicKey = () => process.env.VAPID_PUBLIC_KEY ?? null;

let ready = false;
function setup() {
  if (ready || !pushConfigured()) return ready;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || SITE_URL, process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  ready = true;
  return ready;
}

export interface PushMessage {
  title: string;
  body: string;
  /** Path or URL opened when the notification is tapped. */
  link?: string | null;
  /** Same tag replaces an earlier notification instead of stacking. */
  tag?: string;
}

/** Sends to every device the user turned push on for. Returns how many got it. */
export async function sendPush(userId: string, msg: PushMessage): Promise<number> {
  if (!setup()) return 0;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  const payload = JSON.stringify({
    title: msg.title,
    body: msg.body,
    url: msg.link ? new URL(msg.link, SITE_URL).pathname + new URL(msg.link, SITE_URL).search : "/",
    tag: msg.tag,
  });
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 12 * 60 * 60 });
      sent++;
      await prisma.pushSubscription.update({ where: { id: s.id }, data: { lastOkAt: new Date() } }).catch(() => undefined);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      // The browser unsubscribed or the subscription expired: forget it.
      if (status === 404 || status === 410) await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => undefined);
      else console.error("[push]", status ?? e);
    }
  }
  return sent;
}
