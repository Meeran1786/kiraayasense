import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const decisionSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("APPROVE"),
    // Proofs the moderator checked and accepts; any others are rejected.
    // Proofs are never shown publicly — an approved one only earns the
    // review its "Proof verified" badge.
    approvedProofIds: z.array(z.string().uuid()).default([]),
  }),
  z.object({
    decision: z.literal("REJECT"),
    reason: z.string().trim().min(10, "Give the reviewer a reason of at least 10 characters").max(500),
  }),
]);

/** POST /api/admin/reviews/:id/decision — approve or reject a pending review (FR-REV-6). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const parsed = decisionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.issues[0].message } },
      { status: 422 }
    );
  }

  const review = await prisma.review.findUnique({ where: { id: params.id }, include: { proofs: true } });
  if (!review) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Review not found" } }, { status: 404 });
  if (review.status !== "PENDING_REVIEW") {
    return NextResponse.json(
      { error: { code: "CONFLICT", message: "This review was already moderated" } },
      { status: 409 }
    );
  }

  const input = parsed.data;
  const moderation = { moderatedById: session!.user.id, moderatedAt: new Date() };

  await prisma.$transaction(async (tx) => {
    if (input.decision === "APPROVE") {
      const approved = new Set(input.approvedProofIds);
      await tx.review.update({ where: { id: review.id }, data: { status: "APPROVED", ...moderation } });
      await tx.reviewMedia.updateMany({ where: { reviewId: review.id }, data: { status: "APPROVED" } });
      for (const proof of review.proofs) {
        await tx.verificationProof.update({
          where: { id: proof.id },
          data: { status: approved.has(proof.id) ? "APPROVED" : "REJECTED" },
        });
      }
    } else {
      await tx.review.update({
        where: { id: review.id },
        data: { status: "REJECTED", rejectionReason: input.reason, ...moderation },
      });
      await tx.reviewMedia.updateMany({ where: { reviewId: review.id }, data: { status: "REJECTED" } });
      await tx.verificationProof.updateMany({ where: { reviewId: review.id }, data: { status: "REJECTED" } });
    }
    await tx.auditLog.create({
      data: {
        actorUserId: session!.user.id,
        action: input.decision === "APPROVE" ? "REVIEW_APPROVED" : "REVIEW_REJECTED",
        entityType: "Review",
        entityId: review.id,
        metadata: input,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
