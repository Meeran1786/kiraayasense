import "server-only";
import type { DeliveryStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES } from "@/lib/auth";
import { ALERT_TYPES, DIGEST_TYPES, channelPrefs, type AlertType } from "./types";
import { emailConfigured, sendEmail } from "./email";
import { sendTemplate, whatsappConfigured, type WhatsAppTemplate } from "./whatsapp";

/**
 * One call per event: writes a bell entry for each recipient, then sends
 * email and WhatsApp as each person's settings allow. Digest types (HELPFUL)
 * are left PENDING for the 9 AM run (lib/notify/daily.ts). Never throws: an
 * alert failing must not break the action that caused it.
 */
export interface Alert {
  type: AlertType;
  title: string;
  body: string;
  link?: string;
  /** Urgent admin alerts always email, whatever the setting. */
  urgent?: boolean;
  whatsapp?: WhatsAppTemplate;
}

const recipientSelect = {
  id: true,
  status: true,
  primaryEmail: true,
  primaryPhone: true,
  primaryPhoneVerifiedAt: true,
  whatsappOptInAt: true,
  notificationPrefs: true,
} as const;

type Recipient = {
  id: string;
  status: string;
  primaryEmail: string | null;
  primaryPhone: string | null;
  primaryPhoneVerifiedAt: Date | null;
  whatsappOptInAt: Date | null;
  notificationPrefs: unknown;
};

export const canWhatsApp = (r: Pick<Recipient, "primaryPhone" | "primaryPhoneVerifiedAt" | "whatsappOptInAt">) =>
  !!(r.primaryPhone && r.primaryPhoneVerifiedAt && r.whatsappOptInAt);

/** What each channel should do for this person and alert. */
export function plan(r: Recipient, type: AlertType, urgent = false, hasTemplate = true) {
  const prefs = channelPrefs(r.notificationPrefs, type);
  const digest = DIGEST_TYPES.includes(type);
  const wantEmail = !!r.primaryEmail && (prefs.email || (urgent && ALERT_TYPES[type].audience === "admin"));
  const wantWa = hasTemplate && prefs.whatsapp && canWhatsApp(r);
  return {
    email: wantEmail && emailConfigured() ? (digest ? "PENDING" : "SEND") : "SKIP",
    whatsapp: wantWa && whatsappConfigured() ? (digest ? "PENDING" : "SEND") : "SKIP",
  } as const;
}

async function deliver(recipients: Recipient[], alert: Alert) {
  for (const r of recipients) {
    if (r.status !== "ACTIVE") continue;
    const p = plan(r, alert.type, alert.urgent, !!alert.whatsapp);
    let emailStatus: DeliveryStatus = p.email === "PENDING" ? "PENDING" : "SKIPPED";
    let whatsappStatus: DeliveryStatus = p.whatsapp === "PENDING" ? "PENDING" : "SKIPPED";
    if (p.email === "SEND") emailStatus = (await sendEmail(r.primaryEmail!, alert.title, alert.body, alert.link)) ? "SENT" : "FAILED";
    if (p.whatsapp === "SEND") whatsappStatus = (await sendTemplate(r.primaryPhone!, alert.whatsapp!)) ? "SENT" : "FAILED";
    await prisma.notification.create({
      data: {
        userId: r.id,
        type: alert.type,
        title: alert.title,
        body: alert.body,
        link: alert.link ?? null,
        urgent: !!alert.urgent,
        emailStatus,
        whatsappStatus,
      },
    });
  }
}

function safely(label: string, work: () => Promise<void>) {
  // Not awaited by callers: the request answers at once and alerts go out after.
  work().catch((e) => console.error(`[notify] ${label}`, e));
}

export function notifyUsers(userIds: (string | null | undefined)[], alert: Alert) {
  const ids = Array.from(new Set(userIds.filter((x): x is string => !!x)));
  if (!ids.length) return;
  safely(alert.type, async () => {
    const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: recipientSelect });
    await deliver(users, alert);
  });
}

export function notifyAdmins(alert: Alert, exceptUserId?: string) {
  safely(alert.type, async () => {
    const admins = await prisma.user.findMany({
      where: { role: { in: [...ADMIN_ROLES] }, status: "ACTIVE", ...(exceptUserId ? { id: { not: exceptUserId } } : {}) },
      select: recipientSelect,
    });
    await deliver(admins, alert);
  });
}

/** Awaited version for scripts (the daily run), which must finish before exiting. */
export async function deliverNow(userIds: string[], alert: Alert) {
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: recipientSelect });
  await deliver(users, alert);
}
export { recipientSelect };
