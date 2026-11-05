import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dayEnd, dayStart } from "@/lib/banners";

/**
 * Admin CMS: ad banner management (FR-ADMIN — "admin can log in and make
 * necessary changes to the portal like banner changes"). Access is already
 * gated by middleware.ts (MODERATOR/SUPER_ADMIN only); this route trusts
 * that and just needs the session for createdById + the audit log.
 */

const bannerSchema = z.object({
  title: z.string().min(1),
  imageStorageKey: z.string().min(1),
  clickThroughUrl: z.string().url().regex(/^https?:\/\//, "Use an http(s) link"),
  placement: z.enum(["HOME_HERO", "LOCALITY_PAGE", "SEARCH_INTERSTITIAL"]),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"]).default("DRAFT"),
  targetImpressions: z.number().int().positive(),
  startAt: z.string(),
  endAt: z.string(),
  advertiserName: z.string().min(1),
  advertiserContact: z.string().optional(),
  sortOrder: z.number().int().min(0).max(999).default(0),
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
      startAt: dayStart(parsed.data.startAt),
      endAt: dayEnd(parsed.data.endAt),
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
