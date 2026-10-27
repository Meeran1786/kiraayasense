import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Admin CMS: ad banner management (FR-ADMIN — "admin can log in and make
 * necessary changes to the portal like banner changes"). Access is already
 * gated by middleware.ts (MODERATOR/SUPER_ADMIN only); this route trusts
 * that and just needs the session for createdById + the audit log.
 */

const bannerSchema = z.object({
  title: z.string().min(1),
  imageStorageKey: z.string().min(1),
  clickThroughUrl: z.string().url(),
  placement: z.enum(["HOME_HERO", "LOCALITY_PAGE", "SEARCH_INTERSTITIAL"]),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"]).default("DRAFT"),
  targetImpressions: z.number().int().positive(),
  startAt: z.string(),
  endAt: z.string(),
  advertiserName: z.string().min(1),
  advertiserContact: z.string().optional(),
});

export async function GET() {
  const banners = await prisma.adBanner.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ banners });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const body = await req.json().catch(() => null);
  const parsed = bannerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", fieldErrors: parsed.error.flatten().fieldErrors } },
      { status: 422 }
    );
  }

  const banner = await prisma.adBanner.create({
    data: {
      ...parsed.data,
      startAt: new Date(parsed.data.startAt),
      endAt: new Date(parsed.data.endAt),
      createdById: session!.user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: session!.user.id,
      action: "BANNER_CREATED",
      entityType: "AdBanner",
      entityId: banner.id,
    },
  });

  return NextResponse.json({ banner }, { status: 201 });
}
