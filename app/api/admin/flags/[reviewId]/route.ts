import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const decisionSchema = z.discriminatedUnion("decision", [
  // The review stays (or goes back) up; its open reports are dismissed.
  z.object({ decision: z.literal("KEEP") }),
  // The review comes down; the reason is shown to the reviewer on their profile.
  z.object({
    decision: z.literal("REMOVE"),
    reason: z.string().trim().min(10, "Give the reviewer a reason of at least 10 characters").max(500),
  }),
]);

/** POST /api/admin/flags/:reviewId — settle every open report on a review (FR-REV-8). */
export async function POST(req: NextRequest, { params }: { params: { reviewId: string } }) {
  const session = await getServerSession(authOptions);
  const parsed = decisionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.issues[0].message } }, { status: 422 });
  }
  const review = await prisma.review.findUnique({ where: { id: params.reviewId }, select: { id: true, status: true } });
  if (!review) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Review not found" } }, { status: 404 });
  const open = await prisma.reviewFlag.count({ where: { reviewId: review.id, resolution: "OPEN" } });
  if (open === 0 && review.status !== "SUSPENDED") {
    return NextResponse.json({ error: { code: "CONFLICT", message: "These reports were already settled" } }, { status: 409 });
  }

  const input = parsed.data;
  const now = new Date();
  const moderatorId = session!.user.id;
  await prisma.$transaction(async (tx) => {
    await tx.reviewFlag.updateMany({
      where: { reviewId: review.id, resolution: "OPEN" },
      data: { resolution: input.decision === "KEEP" ? "DISMISSED" : "UPHELD", resolvedAt: now, resolvedById: moderatorId },
    });
    if (input.decision === "KEEP") {
      if (review.status === "SUSPENDED") await tx.review.update({ where: { id: review.id }, data: { status: "APPROVED" } });
    } else {
      await tx.review.update({
        where: { id: review.id },
        data: { status: "REJECTED", rejectionReason: input.reason, moderatedById: moderatorId, moderatedAt: now },
      });
    }
    await tx.auditLog.create({
      data: {
        actorUserId: moderatorId,
        action: input.decision === "KEEP" ? "REVIEW_REPORTS_DISMISSED" : "REVIEW_REMOVED_AFTER_REPORT",
        entityType: "Review",
        entityId: review.id,
        metadata: { ...input, openReports: open },
      },
    });
  });
  return NextResponse.json({ ok: true });
}
