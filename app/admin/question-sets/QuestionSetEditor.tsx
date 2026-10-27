"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { brand, brandGradient } from "@/lib/brand";
import { RELATIONSHIPS, RELATIONSHIP_LABELS, type RelationshipKey } from "@/lib/relationships";
import type { QuestionType } from "@/lib/reviewValidation";
import type { CategoryNode } from "@/lib/db/categories";

interface EditableQuestion {
  key: string;
  label: string;
  helpText: string | null;
  type: QuestionType;
  options: string[];
  required: boolean;
}

interface EditableSet {
  title: string;
  proofRequired: boolean;
  mediaRequired: boolean;
  questions: EditableQuestion[];
}

type Props =
  | {
      mode: "edit";
      setId: string;
      categoryId: string | null;
      relationship: RelationshipKey;
      canRetire: boolean;
      initial: EditableSet;
    }
  | { mode: "new"; categories: CategoryNode[]; initial: EditableSet };

const TYPE_LABELS: Record<QuestionType, string> = {
  STAR: "Star rating (counts toward the score)",
  YES_NO: "Yes / no",
  SINGLE_CHOICE: "Choice",
  NUMBER: "Number",
};

const toKey = (label: string) =>
  label
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "")
    .slice(0, 40);

export function QuestionSetEditor(props: Props) {
  const router = useRouter();
  const [set, setSet] = useState<EditableSet>(props.initial);
  const [categoryId, setCategoryId] = useState<string | null>(props.mode === "edit" ? props.categoryId : null);
  const [relationship, setRelationship] = useState<RelationshipKey>(
    props.mode === "edit" ? props.relationship : "CUSTOMER"
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateQuestion = (index: number, patch: Partial<EditableQuestion>) =>
    setSet((prev) => ({ ...prev, questions: prev.questions.map((q, i) => (i === index ? { ...q, ...patch } : q)) }));

  const move = (index: number, delta: number) =>
    setSet((prev) => {
      const questions = [...prev.questions];
      const [q] = questions.splice(index, 1);
      questions.splice(index + delta, 0, q);
      return { ...prev, questions };
    });

  const publish = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/question-sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...set, categoryId, relationship }),
    });
    const body = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(body?.error?.message ?? "Could not publish this set");
      return;
    }
    router.push(`/admin/question-sets/${body.questionSet.id}`);
    router.refresh();
  };

  const retire = async () => {
    if (props.mode !== "edit") return;
    if (!confirm("Retire this set? Reviews here will use the parent category's or the generic questions.")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/question-sets/${props.setId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "Could not retire this set");
      return;
    }
    router.push("/admin/question-sets");
    router.refresh();
  };

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      {props.mode === "new" && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Applies to">
            <select
              value={categoryId ?? ""}
              onChange={(e) => setCategoryId(e.target.value || null)}
              className={inputCls}
            >
              <option value="">All categories (generic)</option>
              {props.categories.map((top) => (
                <optgroup key={top.id} label={top.name}>
                  <option value={top.id}>{top.name} (whole category)</option>
                  {top.children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="Reviewer relationship">
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value as RelationshipKey)}
              className={inputCls}
            >
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>
                  {RELATIONSHIP_LABELS[r]}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}

      <Field label="Title (shown to admins only)">
        <input value={set.title} onChange={(e) => setSet({ ...set, title: e.target.value })} className={inputCls} />
      </Field>

      <div className="flex flex-wrap gap-6 text-xs text-[var(--ks-text-muted)]">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={set.proofRequired}
            onChange={(e) => setSet({ ...set, proofRequired: e.target.checked })}
          />
          Proof required (otherwise optional, earns a verified badge)
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={set.mediaRequired}
            onChange={(e) => setSet({ ...set, mediaRequired: e.target.checked })}
          />
          Photo or video required
        </label>
      </div>

      <div className="flex flex-col gap-3">
        {set.questions.map((q, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-xl border p-3"
            style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}
          >
            <div className="flex items-center gap-2">
              <input
                value={q.label}
                onChange={(e) => updateQuestion(i, { label: e.target.value })}
                onBlur={() => !q.key && updateQuestion(i, { key: toKey(q.label) })}
                placeholder="Question shown to reviewers"
                className={`${inputCls} flex-1`}
              />
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className={iconBtn} aria-label="Move up">
                <ArrowUp size={14} />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === set.questions.length - 1}
                className={iconBtn}
                aria-label="Move down"
              >
                <ArrowDown size={14} />
              </button>
              <button
                type="button"
                onClick={() => setSet({ ...set, questions: set.questions.filter((_, j) => j !== i) })}
                className={iconBtn}
                aria-label="Remove question"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                value={q.key}
                onChange={(e) => updateQuestion(i, { key: e.target.value.toUpperCase() })}
                placeholder="METRIC_KEY"
                title="Ratings aggregate per key. Reuse an existing key when the question means the same thing."
                className={`${inputCls} font-mono text-xs`}
              />
              <select
                value={q.type}
                onChange={(e) => updateQuestion(i, { type: e.target.value as QuestionType })}
                className={inputCls}
              >
                {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
              {q.type !== "STAR" && (
                <label className="flex items-center gap-2 text-xs text-[var(--ks-text-muted)]">
                  <input type="checkbox" checked={q.required} onChange={(e) => updateQuestion(i, { required: e.target.checked })} />
                  Required
                </label>
              )}
            </div>
            {q.type === "SINGLE_CHOICE" && (
              <input
                value={q.options.join(", ")}
                onChange={(e) => updateQuestion(i, { options: e.target.value.split(",").map((o) => o.trim()) })}
                onBlur={() => updateQuestion(i, { options: q.options.filter(Boolean) })}
                placeholder="Options, separated by commas"
                className={inputCls}
              />
            )}
            <input
              value={q.helpText ?? ""}
              onChange={(e) => updateQuestion(i, { helpText: e.target.value || null })}
              placeholder="Help text (optional)"
              className={`${inputCls} text-xs`}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setSet({
              ...set,
              questions: [...set.questions, { key: "", label: "", helpText: null, type: "STAR", options: [], required: true }],
            })
          }
          className="inline-flex items-center gap-1 self-start rounded-full border border-[var(--ks-border-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--ks-text)]"
        >
          <Plus size={12} /> Add question
        </button>
      </div>

      {error && <p className="text-xs" style={{ color: brand.danger }}>{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={publish}
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50"
          style={{ background: brandGradient }}
        >
          {busy && <Loader2 size={16} className="animate-spin" />}
          {props.mode === "edit" ? "Publish as new version" : "Publish"}
        </button>
        {props.mode === "edit" && props.canRetire && (
          <button type="button" onClick={retire} disabled={busy} className="text-xs text-[var(--ks-text-muted)] hover:underline">
            Retire this set
          </button>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "rounded-lg border border-[var(--ks-border-strong)] bg-transparent px-3 py-2 text-sm text-[var(--ks-text)] focus:outline-none";
const iconBtn = "rounded-md p-1.5 text-[var(--ks-text-muted)] hover:bg-white/5 disabled:opacity-30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-[var(--ks-text-muted)]">{label}</span>
      {children}
    </label>
  );
}
