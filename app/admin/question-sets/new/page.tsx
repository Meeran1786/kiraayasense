import { getCategoryTree } from "@/lib/db/categories";
import { QuestionSetEditor } from "../QuestionSetEditor";

export default async function NewQuestionSetPage() {
  const categories = await getCategoryTree();
  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--ks-text)]">New question set</h1>
      <p className="mt-1 text-sm text-[var(--ks-text-muted)]">
        Pick where it applies. If a set already exists there, this publishes its next version.
      </p>
      <div className="mt-6">
        <QuestionSetEditor
          mode="new"
          categories={categories}
          initial={{
            title: "",
            proofRequired: false,
            mediaRequired: false,
            questions: [
              { key: "VALUE_FOR_MONEY", label: "Value for money", helpText: null, type: "STAR", options: [], required: true },
              { key: "RESPONSIVENESS", label: "Responsiveness to complaints", helpText: null, type: "STAR", options: [], required: true },
              { key: "TRANSPARENCY", label: "Honesty and transparency", helpText: null, type: "STAR", options: [], required: true },
            ],
          }}
        />
      </div>
    </div>
  );
}
