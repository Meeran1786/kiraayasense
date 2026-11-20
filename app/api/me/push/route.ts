import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pushConfigured, vapidPublicKey } from "@/lib/notify/push";

/**
 * GET    /api/me/push               → { enabled, publicKey } (enabled = the site has push set up)
 * POST   /api/me/push { subscription } saves this browser's PushSubscription
 * DELETE /api/me/push { endpoint }  forgets it (turning notifications off here)
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ enabled: pushConfigured(), publicKey: vapidPublicKey() });
}

const Subscription = z.object({
  endpoint: z.string().url().max(1000).startsWith("https://"),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

async function me() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function POST(req: NextRequest) {
  const userId = await me();
  if (!userId) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in first" } }, { status: 401 });
  if (!pushConfigured()) return NextResponse.json({ error: { code: "PUSH_OFF", message: "Notifications aren't set up yet" } }, { status: 503 });
  const body = await req.json().catch(() => null);
  const parsed = Subscription.safeParse(body?.subscription);
  if (!parsed.success) return NextResponse.json({ error: { code: "BAD_SUBSCRIPTION", message: "Invalid subscription" } }, { status: 400 });
  const { endpoint, keys } = parsed.data;
  const userAgent = req.headers.get("user-agent")?.slice(0, 300) ?? null;
  // An endpoint belongs to one browser; if someone else signed in there before, it moves to this user.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth, userAgent },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent },
  });
  // Keep the newest 10 devices per person.
  const old = await prisma.pushSubscription.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, skip: 10, select: { id: true } });
  if (old.length) await prisma.pushSubscription.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const userId = await me();
  if (!userId) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in first" } }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (typeof body?.endpoint !== "string") return NextResponse.json({ error: { code: "BAD_REQUEST", message: "endpoint required" } }, { status: 400 });
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint: body.endpoint } });
  return NextResponse.json({ ok: true });
}
