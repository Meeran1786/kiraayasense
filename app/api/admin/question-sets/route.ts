import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/adminAuth";
import { RELATIONSHIPS } from "@/lib/relationships";

const questionSchema = z
  .object({
    key: z
      .string()
      .regex(/^[A-Z][A-Z0-9_]{1,40}$/, "Keys are UPPER_SNAKE_CASE, e.g. SALARY_ON_TIME"),
    label: z.string().trim().min(3).max(120),
    helpText: z.string().trim().max(200).nullable().optional(),
    type: z.enum(["STAR", "YES_NO", "SINGLE_CHOICE", "NUMBER"]),
    options: z.array(z.string().trim().min(1)).default([]),
    required: z.boolean().default(true),
  })
  .refine((q) => q.type !== "SINGLE_CHOICE" || q.options.length >= 2, {
    message: "A choice question needs at least 2 options",
  });

const setSchema = z
  .object({
    categoryId: z.string().uuid().nullable(),
    relationship: z.enum(RELATIONSHIPS),
    title: z.string().trim().min(3).max(80),
    proofRequired: z.boolean(),
    mediaRequired: z.boolean(),
    questions: z.array(questionSchema).min(1),
  })
  .refine((s) => new Set(s.questions.map((q) => q.key)).size === s.questions.length, {
    message: "Each question key can appear only once in a set",
  })
  .refine((s) => s.questions.filter((q) => q.type === "STAR").length >= 3, {
    message: "A set needs at least 3 rated (star) questions, so reviewers can give 3 reasons",
  });

/**
 * POST /api/admin/question-sets — publish a question set for a (category,
 * relationship) pair. Never edits in place: it creates the next version and
 * deactivates earlier ones, so existing reviews keep the questions they
 * answered.
 */
export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) return auth.response;

  const parsed = setSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: { code: "VALIDATION", message: `${first.path.join(".")} ${first.message}`.trim() } },
      { status: 422 }
    );
  }
  const { categoryId, relationship, questions, ...rest } = parsed.data;

  if (categoryId && !(await prisma.category.findUnique({ where: { id: categoryId } }))) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Category not found" } }, { status: 404 });
  }

  const created = await prisma.$transaction(async (tx) => {
    const latest = await tx.questionSet.findFirst({
      where: { categoryId, relationship },
      orderBy: { version: "desc" },
    });
    await tx.questionSet.updateMany({ where: { categoryId, relationship }, data: { isActive: false } });
    return tx.questionSet.create({
      data: {
        ...rest,
        categoryId,
        relationship,
        version: (latest?.version ?? 0) + 1,
        questions: {
          create: questions.map((q, sortOrder) => ({
            key: q.key,
            label: q.label,
            helpText: q.helpText || null,
            type: q.type,
            options: q.type === "SINGLE_CHOICE" ? q.options : [],
            required: q.type === "STAR" ? true : q.required,
            sortOrder,
          })),
        },
      },
    });
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: auth.session.user.id,
      action: "QUESTION_SET_PUBLISHED",
      entityType: "QuestionSet",
      entityId: created.id,
      metadata: { categoryId, relationship, version: created.version },
    },
  });

  return NextResponse.json({ questionSet: created }, { status: 201 });
}
