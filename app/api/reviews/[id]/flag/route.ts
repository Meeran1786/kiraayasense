import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AUTO_SUSPEND_REPORTS, flagSchema } from "@/lib/flags";
import { onReviewReported } from "@/lib/notify/events";

const error = (status: number, code: string, message: string) =>
  NextResponse.json({ error: { code, message } }, { status });

/**
 * POST /api/reviews/:id/flag — report a published review (FR-REV-8). One
 * report per person per review. Reports from AUTO_SUSPEND_REPORTS different
 * people (not counting the business's own manager) hide the review until a
 * moderator decides.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return error(401, "UNAUTHENTICATED", "Sign in to report a review");
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return error(404, "NOT_FOUND", "Review not found");
  const parsed = flagSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error(422, "VALIDATION", parsed.error.issues[0].message);

  const review = await prisma.review.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, status: true, property: { select: { claimedByUserId: true, claimStatus: true } } },
  });
  if (!review || (review.status !== "APPROVED" && review.status !== "SUSPENDED")) {
    return error(404, "NOT_FOUND", "Review not found");
  }
  if (review.userId === session.user.id) return error(400, "OWN_REVIEW", "You can't report your own review");

  const existing = await prisma.reviewFlag.findUnique({
    where: { reviewId_flaggedByUserId: { reviewId: review.id, flaggedByUserId: session.user.id } },
  });
  if (existing) return error(409, "ALREADY_REPORTED", "You've already reported this review. A moderator will look at it.");

  const ownerId = review.property.claimStatus === "VERIFIED" ? review.property.claimedByUserId : null;
  const hidden = await prisma.$transaction(async (tx) => {
    await tx.reviewFlag.create({
      data: { reviewId: review.id, flaggedByUserId: session.user.id, reason: parsed.data.reason, details: parsed.data.details },
    });
    if (review.status !== "APPROVED") return false;
    const counted = await tx.reviewFlag.count({
      where: { reviewId: review.id, resolution: "OPEN", ...(ownerId ? { flaggedByUserId: { not: ownerId } } : {}) },
    });
    if (counted >= AUTO_SUSPEND_REPORTS) {
      await tx.review.update({ where: { id: review.id }, data: { status: "SUSPENDED" } });
      return true;
    }
    return false;
  });

  onReviewReported(review.id, hidden, session.user.id);

  return NextResponse.json({ ok: true }, { status: 201 });
}
