import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  imageStorageKey: z.string().min(1).optional(),
  clickThroughUrl: z.string().url().optional(),
  placement: z.enum(["HOME_HERO", "LOCALITY_PAGE", "SEARCH_INTERSTITIAL"]).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"]).optional(),
  targetImpressions: z.number().int().positive().optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  advertiserName: z.string().min(1).optional(),
  advertiserContact: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", fieldErrors: parsed.error.flatten().fieldErrors } },
      { status: 422 }
    );
  }

  const { startAt, endAt, ...rest } = parsed.data;
  const banner = await prisma.adBanner.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(startAt ? { startAt: new Date(startAt) } : {}),
      ...(endAt ? { endAt: new Date(endAt) } : {}),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: session!.user.id,
      action: "BANNER_UPDATED",
      entityType: "AdBanner",
      entityId: banner.id,
      metadata: parsed.data,
    },
  });

  return NextResponse.json({ banner });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  await prisma.adBanner.delete({ where: { id: params.id } });

  await prisma.auditLog.create({
    data: {
      actorUserId: session!.user.id,
      action: "BANNER_DELETED",
      entityType: "AdBanner",
      entityId: params.id,
    },
  });

  return NextResponse.json({ ok: true });
}
