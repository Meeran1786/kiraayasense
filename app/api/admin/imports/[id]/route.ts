import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const actionSchema = z.object({ action: z.enum(["PUBLISH", "REJECT"]) });

/**
 * POST /api/admin/imports/:id — publish or reject every listing an import
 * batch created that is still awaiting review. Listings a moderator already
 * edited to another status are left alone.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Unknown action" } }, { status: 422 });
  }
  const job = await prisma.importJob.findUnique({ where: { id: params.id } });
  if (!job) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Import not found" } }, { status: 404 });

  const created = await prisma.importRecord.findMany({
    where: { jobId: job.id, action: "CREATED", propertyId: { not: null } },
    select: { propertyId: true },
  });
  const { count } = await prisma.property.updateMany({
    where: { id: { in: created.map((r) => r.propertyId!) }, status: "PENDING_VERIFICATION" },
    data:
      parsed.data.action === "PUBLISH"
        ? { status: "APPROVED" }
        : { status: "REJECTED", rejectionReason: "Import batch rejected in review" },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: session!.user.id,
      action: parsed.data.action === "PUBLISH" ? "IMPORT_PUBLISHED" : "IMPORT_REJECTED",
      entityType: "ImportJob",
      entityId: job.id,
      metadata: { listings: count },
    },
  });
  return NextResponse.json({ updated: count });
}
