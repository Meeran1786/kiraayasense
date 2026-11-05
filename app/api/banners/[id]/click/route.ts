import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";

/**
 * GET /api/banners/<id>/click?s=<session> — counts a banner click, then sends
 * the visitor on to the advertiser's page. Paused or ended banners still
 * redirect (an old tab may hold the link) but are not counted.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.redirect(new URL("/", SITE_URL));
  const banner = await prisma.adBanner.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, clickThroughUrl: true },
  });
  if (!banner) return NextResponse.redirect(new URL("/", SITE_URL));

  if (banner.status === "ACTIVE") {
    const session = await getServerSession(authOptions).catch(() => null);
    const sessionId = (req.nextUrl.searchParams.get("s") ?? "").slice(0, 64) || "anon";
    await prisma.bannerEvent
      .create({ data: { bannerId: banner.id, eventType: "CLICK", sessionId, userId: session?.user?.id ?? null } })
      .catch(() => undefined);
  }
  return NextResponse.redirect(banner.clickThroughUrl, 302);
}
