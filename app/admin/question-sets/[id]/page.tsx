import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getQuestionSetById } from "@/lib/db/questionSets";
import { RELATIONSHIP_LABELS } from "@/lib/relationships";
import { QuestionSetEditor } from "../QuestionSetEditor";

export default async function EditQuestionSetPage({ params }: { params: { id: string } }) {
  const set = await getQuestionSetById(params.id);
  if (!set) notFound();
  const row = await prisma.questionSet.findUniqueOrThrow({
    where: { id: params.id },
    include: { category: { include: { parent: true } } },
  });
  const place = row.category
    ? row.category.parent
      ? `${row.category.parent.name} › ${row.category.name}`
      : row.category.name
    : "All categories (generic)";

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--ks-text)]">{set.title}</h1>
      <p className="mt-1 text-sm text-[var(--ks-text-muted)]">
        {place} · {RELATIONSHIP_LABELS[set.relationship]} · v{row.version}
        {!set.isActive && " · retired"}
      </p>
      <div className="mt-6">
        <QuestionSetEditor
          mode="edit"
          setId={set.id}
          categoryId={row.categoryId}
          relationship={set.relationship}
          canRetire={!!row.categoryId && set.isActive}
          initial={set}
        />
      </div>
    </div>
  );
}
