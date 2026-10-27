import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reviewSubmissionSchema } from "@/lib/reviewValidation";

/**
 * Real implementation of docs/API_CONTRACT.md "POST /api/reviews" — writes
 * to Postgres via Prisma instead of the old in-memory mock. Still runs the
 * exact same zod schema (7 category scores, 3+ reasons at 20+ chars, at
 * least one media file, at least one consented payment proof) as the
 * client-side validation in ReviewSubmissionModal.
 *
 * FR-REV-1: requires an authenticated session — this is the actual
 * enforcement point, not just the UI gate in WriteReviewGate.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sign in before submitting a review" } },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = reviewSubmissionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION",
          message: "Review submission failed validation",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 422 }
    );
  }

  const input = parsed.data;

  const property = await prisma.property.findUnique({ where: { id: input.propertyId } });
  if (!property) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Property not found" } },
      { status: 404 }
    );
  }

  // One review per user per property within a 180-day cooldown (FR-REV edge
  // cases) — enforced here at the application layer since Postgres can't
  // express a time-windowed uniqueness constraint declaratively.
  const cooldownStart = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
  const recentReview = await prisma.review.findFirst({
    where: { propertyId: input.propertyId, userId: session.user.id, createdAt: { gte: cooldownStart } },
  });
  if (recentReview) {
    return NextResponse.json(
      {
        error: {
          code: "COOLDOWN",
          message: "You've already reviewed this property in the last 180 days",
        },
      },
      { status: 409 }
    );
  }

  const consentedAt = new Date();

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        propertyId: input.propertyId,
        userId: session.user.id,
        stayStartApprox: input.stayStartApprox ? new Date(input.stayStartApprox) : undefined,
        stayEndApprox: input.stayEndApprox ? new Date(input.stayEndApprox) : undefined,
        categoryScores: {
          create: input.categoryScores.map((c) => ({ category: c.category, score: c.score })),
        },
        reasons: {
          create: input.reasons.map((r) => ({ type: r.type, category: r.category, text: r.text })),
        },
        media: {
          create: input.mediaStorageKeys.map((key) => ({
            kind: key.toLowerCase().endsWith(".mp4") ? "VIDEO" : "PHOTO",
            storageKey: key,
            mimeType: key.toLowerCase().endsWith(".mp4") ? "video/mp4" : "image/jpeg",
            byteSize: 0, // not tracked by the local-disk upload route; fill in once real object storage reports it
          })),
        },
        proofs: {
          create: input.proofStorageKeys.map((p) => ({
            proofType: p.proofType,
            storageKey: p.storageKey,
            mimeType: "application/octet-stream",
            byteSize: 0,
            consentedAt,
          })),
        },
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: session.user.id,
        action: "REVIEW_SUBMITTED",
        entityType: "Review",
        entityId: created.id,
        metadata: { propertyId: input.propertyId },
      },
    });

    return created;
  });

  return NextResponse.json({ id: review.id, status: review.status }, { status: 201 });
}
