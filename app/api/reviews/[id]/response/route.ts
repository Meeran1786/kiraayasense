import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { managesProperty, replySchema } from "@/lib/owner";

const error = (status: number, code: string, message: string) =>
  NextResponse.json({ error: { code, message } }, { status });

/** Loads the review and checks the signed-in user manages its business. */
async function authorise(reviewId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { response: error(401, "UNAUTHENTICATED", "Sign in to reply") };
  if (!/^[0-9a-f-]{36}$/i.test(reviewId)) return { response: error(404, "NOT_FOUND", "Review not found") };
  const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { id: true, propertyId: true, status: true } });
  if (!review || review.status !== "APPROVED") return { response: error(404, "NOT_FOUND", "Review not found") };
  if (!(await managesProperty(session.user.id, review.propertyId))) {
    return { response: error(403, "FORBIDDEN", "Only the verified manager of this business can reply") };
  }
  return { userId: session.user.id, review };
}

/**
 * PUT /api/reviews/:id/response — post or edit the business's one public
 * reply to a review (FR-REV-7). Every new or edited reply goes back to
 * moderation before it is shown.
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authorise(params.id);
  if ("response" in auth) return auth.response;
  const parsed = replySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error(422, "VALIDATION", parsed.error.issues[0].message);

  const data = {
    text: parsed.data.text,
    respondedByUserId: auth.userId,
    status: "PENDING_REVIEW" as const,
    rejectionReason: null,
    moderatedById: null,
    moderatedAt: null,
  };
  const reply = await prisma.ownerResponse.upsert({
    where: { reviewId: auth.review.id },
    update: data,
    create: { reviewId: auth.review.id, ...data },
    select: { status: true, text: true },
  });
  return NextResponse.json(reply);
}

/** DELETE /api/reviews/:id/response — the manager withdraws their reply. */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authorise(params.id);
  if ("response" in auth) return auth.response;
  await prisma.ownerResponse.deleteMany({ where: { reviewId: auth.review.id } });
  return NextResponse.json({ ok: true });
}
