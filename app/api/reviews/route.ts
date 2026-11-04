import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkAgainstQuestionSet, reviewSubmissionSchema } from "@/lib/reviewValidation";
import { relationshipsForCategory } from "@/lib/db/categories";
import { resolveQuestionSet } from "@/lib/db/questionSets";

const VISIT_COOLDOWN_DAYS = 30;

/**
 * POST /api/reviews. Runs the same rules as the client form
 * (lib/reviewValidation.ts): the shape check, then every answer checked
 * against the question set the reviewer was shown, which must still be the
 * current set for this business's category and the reviewer's relationship.
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
  if (!property || property.status !== "APPROVED") {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Business not found" } },
      { status: 404 }
    );
  }

  const allowedRelationships = await relationshipsForCategory(property.categoryId);
  if (!allowedRelationships.includes(input.relationship)) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "That relationship isn't offered for this business" } },
      { status: 422 }
    );
  }

  const questionSet = await resolveQuestionSet(property.categoryId, input.relationship);
  if (!questionSet || questionSet.id !== input.questionSetId) {
    return NextResponse.json(
      { error: { code: "STALE_QUESTIONS", message: "The questions for this review were just updated. Reload the page and try again." } },
      { status: 409 }
    );
  }

  const problems = checkAgainstQuestionSet(input, questionSet);
  if (problems.length > 0) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: problems[0], problems } },
      { status: 422 }
    );
  }
  const questionsById = new Map(questionSet.questions.map((q) => [q.id, q]));

  // A reviewer can add a new visit to a business they already reviewed, but
  // only 30 days after their last one (unless that was rejected). Each visit
  // is its own review; the business rating uses only their latest.
  const cooldownStart = new Date(Date.now() - VISIT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  const recentReview = await prisma.review.findFirst({
    where: {
      propertyId: input.propertyId,
      userId: session.user.id,
      createdAt: { gte: cooldownStart },
      status: { not: "REJECTED" },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recentReview) {
    const nextAllowed = new Date(recentReview.createdAt.getTime() + VISIT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
    return NextResponse.json(
      {
        error: {
          code: "COOLDOWN",
          message: `You reviewed this business recently. You can add a new visit from ${nextAllowed.toLocaleDateString("en-IN", { day: "numeric", month: "long" })}.`,
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
        relationship: input.relationship,
        questionSetId: questionSet.id,
        isAnonymous: input.isAnonymous,
        answers: {
          create: input.answers.map((a) => {
            const question = questionsById.get(a.questionId)!;
            return {
              questionId: question.id,
              questionKey: question.key,
              starValue: question.type === "STAR" ? (a.value as number) : undefined,
              boolValue: question.type === "YES_NO" ? (a.value as boolean) : undefined,
              choiceValue: question.type === "SINGLE_CHOICE" ? (a.value as string) : undefined,
              numberValue: question.type === "NUMBER" ? (a.value as number) : undefined,
            };
          }),
        },
        reasons: {
          create: input.reasons.map((r) => ({ type: r.type, questionKey: r.questionKey, text: r.text })),
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
