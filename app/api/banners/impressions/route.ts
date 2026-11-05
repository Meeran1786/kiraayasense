import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HOME_BANNER_LIMIT } from "@/lib/banners";

/**
 * POST /api/banners/impressions { ids, sessionId } — the carousel reports
 * each banner the first time it is on screen during a page view. Only active
 * banners are counted.
 */
const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(HOME_BANNER_LIMIT),
  sessionId: z.string().min(1).max(64),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION" } }, { status: 422 });

  const active = await prisma.adBanner.findMany({
    where: { id: { in: parsed.data.ids }, status: "ACTIVE" },
    select: { id: true },
  });
  if (active.length) {
    const session = await getServerSession(authOptions).catch(() => null);
    await prisma.bannerEvent.createMany({
      data: active.map((b) => ({
        bannerId: b.id,
        eventType: "IMPRESSION" as const,
        sessionId: parsed.data.sessionId,
        userId: session?.user?.id ?? null,
      })),
    });
  }
  return new NextResponse(null, { status: 204 });
}
