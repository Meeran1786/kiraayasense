import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ALERT_TYPES, isAlertType, type AlertPrefs } from "@/lib/notify/types";

export const dynamic = "force-dynamic";

/**
 * PATCH { prefs?: { TYPE: { email?, whatsapp? } }, whatsapp?: boolean }
 * saves the per-alert switches and the overall WhatsApp opt-in. Opting in
 * needs a verified phone.
 */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in first" } }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { notificationPrefs: true, primaryPhone: true, primaryPhoneVerifiedAt: true },
  });

  const prefs: AlertPrefs = { ...((user.notificationPrefs as AlertPrefs | null) ?? {}) };
  if (body?.prefs && typeof body.prefs === "object") {
    for (const [type, value] of Object.entries(body.prefs as Record<string, unknown>)) {
      if (!isAlertType(type) || !value || typeof value !== "object") continue;
      const v = value as Record<string, unknown>;
      const next = { ...prefs[type] };
      if (typeof v.email === "boolean") next.email = v.email;
      if (typeof v.whatsapp === "boolean") next.whatsapp = v.whatsapp;
      prefs[type] = next;
    }
  }

  const data: { notificationPrefs: object; whatsappOptInAt?: Date | null } = { notificationPrefs: prefs };
  if (typeof body?.whatsapp === "boolean") {
    if (body.whatsapp && !(user.primaryPhone && user.primaryPhoneVerifiedAt)) {
      return NextResponse.json({ error: { code: "NO_PHONE", message: "Verify your WhatsApp number first" } }, { status: 422 });
    }
    data.whatsappOptInAt = body.whatsapp ? new Date() : null;
  }
  await prisma.user.update({ where: { id: session.user.id }, data });
  return NextResponse.json({ ok: true, prefs, known: Object.keys(ALERT_TYPES).length });
}
