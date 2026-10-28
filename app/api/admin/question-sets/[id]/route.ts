import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/adminAuth";

const patchSchema = z.object({ isActive: z.literal(false) });

/**
 * PATCH /api/admin/question-sets/:id { isActive: false } — retire a
 * category-specific set so reviews fall back to the parent category's or the
 * generic set. Generic sets can't be retired: they are the last fallback.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) return auth.response;

  if (!patchSchema.safeParse(await req.json().catch(() => null)).success) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Only { isActive: false } is supported" } }, { status: 422 });
  }

  const set = await prisma.questionSet.findUnique({ where: { id: params.id } });
  if (!set) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Question set not found" } }, { status: 404 });
  if (!set.categoryId) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Generic sets are the last fallback and can't be retired. Publish a new version instead." } },
      { status: 422 }
    );
  }

  await prisma.questionSet.update({ where: { id: set.id }, data: { isActive: false } });
  await prisma.auditLog.create({
    data: { actorUserId: auth.session.user.id, action: "QUESTION_SET_RETIRED", entityType: "QuestionSet", entityId: set.id },
  });
  return NextResponse.json({ ok: true });
}
