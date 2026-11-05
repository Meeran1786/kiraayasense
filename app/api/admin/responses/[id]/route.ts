import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const decisionSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("APPROVE") }),
  z.object({
    decision: z.literal("REJECT"),
    reason: z.string().trim().min(10, "Tell the owner why, in at least 10 characters").max(500),
  }),
]);

/** POST /api/admin/responses/:id — publish or turn down an owner's reply (FR-REV-7). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const parsed = decisionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.issues[0].message } }, { status: 422 });
  }
  const reply = await prisma.ownerResponse.findUnique({ where: { id: params.id } });
  if (!reply) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Reply not found" } }, { status: 404 });
  if (reply.status !== "PENDING_REVIEW") {
    return NextResponse.json({ error: { code: "CONFLICT", message: "This reply was already moderated" } }, { status: 409 });
  }

  const input = parsed.data;
  await prisma.$transaction([
    prisma.ownerResponse.update({
      where: { id: reply.id },
      data: {
        status: input.decision === "APPROVE" ? "APPROVED" : "REJECTED",
        rejectionReason: input.decision === "REJECT" ? input.reason : null,
        moderatedById: session!.user.id,
        moderatedAt: new Date(),
      },
    }),
    prisma.auditLog.create({
      data: {
        actorUserId: session!.user.id,
        action: input.decision === "APPROVE" ? "OWNER_REPLY_APPROVED" : "OWNER_REPLY_REJECTED",
        entityType: "OwnerResponse",
        entityId: reply.id,
        metadata: input,
      },
    }),
  ]);
  return NextResponse.json({ ok: true });
}
