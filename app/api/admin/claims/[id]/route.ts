import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const decisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  note: z.string().trim().max(500).optional(),
});

/** POST /api/admin/claims/:id — approve (the claimant now manages the listing) or reject. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const parsed = decisionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION", message: "Bad decision" } }, { status: 422 });

  const claim = await prisma.businessClaim.findUnique({ where: { id: params.id } });
  if (!claim) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Claim not found" } }, { status: 404 });
  if (claim.status !== "PENDING") {
    return NextResponse.json({ error: { code: "CONFLICT", message: "This claim was already decided" } }, { status: 409 });
  }

  const approve = parsed.data.decision === "APPROVE";
  const reviewed = { reviewedById: session!.user.id, reviewedAt: new Date(), decisionNote: parsed.data.note || null };

  await prisma.$transaction(async (tx) => {
    await tx.businessClaim.update({ where: { id: claim.id }, data: { status: approve ? "APPROVED" : "REJECTED", ...reviewed } });
    if (approve) {
      await tx.property.update({
        where: { id: claim.propertyId },
        data: { claimStatus: "VERIFIED", claimedByUserId: claim.userId },
      });
      // Only one owner per listing: other open claims on it are closed.
      await tx.businessClaim.updateMany({
        where: { propertyId: claim.propertyId, status: "PENDING" },
        data: { status: "REJECTED", ...reviewed, decisionNote: "Another claim on this listing was approved" },
      });
    } else {
      const open = await tx.businessClaim.count({ where: { propertyId: claim.propertyId, status: "PENDING" } });
      const property = await tx.property.findUniqueOrThrow({ where: { id: claim.propertyId }, select: { claimStatus: true } });
      if (open === 0 && property.claimStatus === "PENDING_VERIFICATION") {
        await tx.property.update({ where: { id: claim.propertyId }, data: { claimStatus: "UNCLAIMED" } });
      }
    }
    await tx.auditLog.create({
      data: {
        actorUserId: session!.user.id,
        action: approve ? "CLAIM_APPROVED" : "CLAIM_REJECTED",
        entityType: "BusinessClaim",
        entityId: claim.id,
        metadata: { propertyId: claim.propertyId, note: parsed.data.note ?? null },
      },
    });
  });

  return NextResponse.json({ ok: true });
}
