import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendCode, whatsappConfigured } from "@/lib/notify/whatsapp";
import { CODE_TTL_MS, MAX_ATTEMPTS, MAX_CODES_PER_HOUR, hashCode, newCode, normalisePhone, sameHash } from "@/lib/notify/phone";

export const dynamic = "force-dynamic";

const error = (status: number, code: string, message: string) =>
  NextResponse.json({ error: { code, message } }, { status });

/**
 * POST { phone }        sends a 6-digit code to that number on WhatsApp.
 * PUT  { phone, code }  checks it; on success the number becomes the user's
 *                       verified phone and WhatsApp alerts are switched on.
 * DELETE                removes the phone and switches WhatsApp off.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return error(401, "UNAUTHENTICATED", "Sign in first");
  if (!whatsappConfigured()) return error(503, "WHATSAPP_OFF", "WhatsApp alerts aren't switched on yet. Please try again later.");

  const body = await req.json().catch(() => null);
  const phone = normalisePhone(body?.phone);
  if (!phone) return error(422, "VALIDATION", "Enter a valid mobile number, like 98765 43210");

  const taken = await prisma.user.findFirst({ where: { primaryPhone: phone, id: { not: session.user.id } }, select: { id: true } });
  if (taken) return error(409, "PHONE_TAKEN", "This number is already verified on another account");

  const recent = await prisma.phoneVerification.count({
    where: { userId: session.user.id, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recent >= MAX_CODES_PER_HOUR) return error(429, "TOO_MANY", "Too many codes requested. Please wait an hour and try again.");

  const code = newCode();
  const sent = await sendCode(phone, code);
  if (!sent) return error(502, "SEND_FAILED", "We couldn't send the code. Check that the number is on WhatsApp.");

  await prisma.phoneVerification.create({
    data: {
      userId: session.user.id,
      phone,
      codeHash: hashCode(code, session.user.id, phone),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });
  return NextResponse.json({ ok: true, phone });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return error(401, "UNAUTHENTICATED", "Sign in first");
  const body = await req.json().catch(() => null);
  const phone = normalisePhone(body?.phone);
  const code = typeof body?.code === "string" ? body.code.replace(/\D/g, "") : "";
  if (!phone || code.length !== 6) return error(422, "VALIDATION", "Enter the 6-digit code");

  const pending = await prisma.phoneVerification.findFirst({
    where: { userId: session.user.id, phone, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!pending || pending.attempts >= MAX_ATTEMPTS) return error(410, "EXPIRED", "That code has expired. Ask for a new one.");

  if (!sameHash(pending.codeHash, hashCode(code, session.user.id, phone))) {
    await prisma.phoneVerification.update({ where: { id: pending.id }, data: { attempts: { increment: 1 } } });
    return error(422, "WRONG_CODE", "That code isn't right. Check WhatsApp and try again.");
  }

  const now = new Date();
  try {
    await prisma.$transaction([
      prisma.phoneVerification.update({ where: { id: pending.id }, data: { usedAt: now } }),
      prisma.user.update({
        where: { id: session.user.id },
        data: { primaryPhone: phone, primaryPhoneVerifiedAt: now, whatsappOptInAt: now },
      }),
      prisma.auditLog.create({
        data: { actorUserId: session.user.id, action: "PHONE_VERIFIED", entityType: "User", entityId: session.user.id },
      }),
    ]);
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return error(409, "PHONE_TAKEN", "This number is already verified on another account");
    throw e;
  }
  return NextResponse.json({ ok: true, phone, whatsapp: true });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return error(401, "UNAUTHENTICATED", "Sign in first");
  await prisma.user.update({
    where: { id: session.user.id },
    data: { primaryPhone: null, primaryPhoneVerifiedAt: null, whatsappOptInAt: null },
  });
  return NextResponse.json({ ok: true });
}
