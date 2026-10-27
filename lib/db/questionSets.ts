import "server-only";
import type { Relationship } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { QuestionSetDTO } from "@/lib/reviewValidation";

const questionSetInclude = { questions: { orderBy: { sortOrder: "asc" as const } } };

/**
 * The questions to ask for a review of a business in `categoryId` by a
 * reviewer with `relationship`. Most specific wins: the sub-category's own
 * set, then its parent category's, then the generic set for the
 * relationship (categoryId null). Always the newest active version.
 */
export async function resolveQuestionSet(categoryId: string, relationship: Relationship): Promise<QuestionSetDTO | null> {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) return null;

  for (const id of [category.id, category.parentId ?? undefined, null]) {
    if (id === undefined) continue;
    const set = await prisma.questionSet.findFirst({
      where: { categoryId: id, relationship, isActive: true },
      orderBy: { version: "desc" },
      include: questionSetInclude,
    });
    if (set) return toDTO(set);
  }
  return null;
}

export async function getQuestionSetById(id: string): Promise<QuestionSetDTO | null> {
  const set = await prisma.questionSet.findUnique({ where: { id }, include: questionSetInclude });
  return set ? toDTO(set) : null;
}

type QuestionSetRow = NonNullable<Awaited<ReturnType<typeof prisma.questionSet.findFirst<{ include: typeof questionSetInclude }>>>>;

function toDTO(set: QuestionSetRow): QuestionSetDTO {
  return {
    id: set.id,
    title: set.title,
    relationship: set.relationship,
    isActive: set.isActive,
    proofRequired: set.proofRequired,
    mediaRequired: set.mediaRequired,
    questions: set.questions.map((q) => ({
      id: q.id,
      key: q.key,
      label: q.label,
      helpText: q.helpText,
      type: q.type,
      options: q.options,
      required: q.required,
    })),
  };
}
