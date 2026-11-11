import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET  /api/me/notifications            → { unread, items } (latest 20)
 * GET  /api/me/notifications?count=1    → { unread } only (the bell badge)
 * POST /api/me/notifications            → marks everything read
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ unread: 0, items: [] });
  const unread = await prisma.notification.count({ where: { userId, readAt: null } });
  if (req.nextUrl.searchParams.get("count")) return NextResponse.json({ unread });
  const items = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, type: true, title: true, body: true, link: true, urgent: true, readAt: true, createdAt: true },
  });
  return NextResponse.json({ unread, items });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
