import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { RELATIONSHIPS } from "@/lib/relationships";
import { relationshipsForCategory } from "@/lib/db/categories";
import { resolveQuestionSet } from "@/lib/db/questionSets";

const querySchema = z.object({
  categoryId: z.string().uuid(),
  relationship: z.enum(RELATIONSHIPS),
});

/**
 * GET /api/question-sets?categoryId=&relationship= — the questions to show
 * in the review form for a business in this (sub-)category and a reviewer
 * with this relationship to it.
 */
export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", fieldErrors: parsed.error.flatten().fieldErrors } },
      { status: 422 }
    );
  }
  const { categoryId, relationship } = parsed.data;

  const allowed = await relationshipsForCategory(categoryId);
  if (!allowed.includes(relationship)) {
    return NextResponse.json(
      { error: { code: "NOT_ALLOWED", message: "That relationship isn't offered for this category" } },
      { status: 422 }
    );
  }

  const questionSet = await resolveQuestionSet(categoryId, relationship);
  if (!questionSet) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "No questions configured" } }, { status: 404 });
  }
  return NextResponse.json({ questionSet });
}
