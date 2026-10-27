"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Loader2, ShieldCheck } from "lucide-react";
import { CategoryScoreSlider } from "./CategoryScoreSlider";
import { ReasonsEditor } from "./ReasonsEditor";
import { ProofUploadSection } from "./ProofUploadSection";
import {
  MIN_REASONS,
  MIN_REASON_LENGTH,
  checkAgainstQuestionSet,
  reviewSubmissionSchema,
  type AnswerValue,
  type ProofType,
  type QuestionDTO,
  type QuestionSetDTO,
  type ReasonDraft,
} from "@/lib/reviewValidation";
import { RELATIONSHIP_LABELS, type RelationshipKey } from "@/lib/relationships";
import { brand, brandGradient } from "@/lib/brand";

interface ReviewSubmissionModalProps {
  propertyId: string;
  propertyName: string;
  categoryId: string;
  relationships: RelationshipKey[];
  isHousing: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: (reviewId: string) => void;
}

type ProofEntry = { proofType: ProofType; storageKey: string; consented: true };

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `reason-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function blankReasons(set: QuestionSetDTO): ReasonDraft[] {
  const firstKey = set.questions.find((q) => q.type === "STAR")?.key ?? "";
  return [
    { id: makeId(), type: "CON", questionKey: firstKey, text: "" },
    { id: makeId(), type: "CON", questionKey: firstKey, text: "" },
    { id: makeId(), type: "PRO", questionKey: firstKey, text: "" },
  ];
}

// Star questions start at 3 (the slider needs a value); the rest start
// unanswered so an untouched optional question isn't submitted.
function defaultAnswers(set: QuestionSetDTO): Record<string, AnswerValue> {
  return Object.fromEntries(set.questions.filter((q) => q.type === "STAR").map((q) => [q.id, 3]));
}

export function ReviewSubmissionModal({
  propertyId,
  propertyName,
  categoryId,
  relationships,
  isHousing,
  isOpen,
  onClose,
  onSubmitted,
}: ReviewSubmissionModalProps) {
  // Step 1 picks how the reviewer knows the business; that (plus the
  // business's sub-category) decides which questions step 2 asks.
  const [relationship, setRelationship] = useState<RelationshipKey | null>(
    relationships.length === 1 ? relationships[0] : null
  );
  const [questionSet, setQuestionSet] = useState<QuestionSetDTO | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [reasons, setReasons] = useState<ReasonDraft[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [mediaStorageKeys, setMediaStorageKeys] = useState<string[]>([]);
  const [proofEntries, setProofEntries] = useState<ProofEntry[]>([]);
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!relationship) return;
    let cancelled = false;
    setQuestionSet(null);
    setLoadError(null);
    fetch(`/api/question-sets?categoryId=${categoryId}&relationship=${relationship}`)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error?.message ?? "Could not load the questions");
        return body.questionSet as QuestionSetDTO;
      })
      .then((set) => {
        if (cancelled) return;
        setQuestionSet(set);
        setAnswers(defaultAnswers(set));
        setReasons(blankReasons(set));
      })
      .catch((err) => !cancelled && setLoadError(err instanceof Error ? err.message : "Could not load the questions"));
    return () => {
      cancelled = true;
    };
  }, [relationship, categoryId]);

  // Reason rows the user has started (typed at least one character into).
  // A pristine row is an unused slot and must not be sent, or the 20-char
  // minimum would reject the whole submission over a field never touched.
  const startedReasons = useMemo(() => reasons.filter((r) => r.text.trim().length > 0), [reasons]);

  const payload = useMemo(
    () =>
      questionSet && relationship
        ? {
            propertyId,
            relationship,
            questionSetId: questionSet.id,
            isAnonymous,
            answers: Object.entries(answers).map(([questionId, value]) => ({ questionId, value })),
            reasons: startedReasons.map(({ id, ...rest }) => rest),
            mediaStorageKeys,
            proofStorageKeys: proofEntries,
          }
        : null,
    [propertyId, relationship, questionSet, isAnonymous, answers, startedReasons, mediaStorageKeys, proofEntries]
  );

  const problems = useMemo(() => {
    if (!payload || !questionSet) return ["Pick how you know this business."];
    const parsed = reviewSubmissionSchema.safeParse(payload);
    if (!parsed.success) return parsed.error.issues.map((i) => i.message);
    return checkAgainstQuestionSet(parsed.data, questionSet);
  }, [payload, questionSet]);

  if (!isOpen) return null;

  const starQuestions = questionSet?.questions.filter((q) => q.type === "STAR") ?? [];
  const factQuestions = questionSet?.questions.filter((q) => q.type !== "STAR") ?? [];

  const setAnswer = (questionId: string, value: AnswerValue | null) =>
    setAnswers((prev) => {
      const next = { ...prev };
      if (value === null) delete next[questionId];
      else next[questionId] = value;
      return next;
    });

  const handleSubmit = async () => {
    if (!payload || problems.length > 0) return;
    setSubmitState("submitting");
    setSubmitError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Could not submit your review");
      }
      const { id } = await res.json();
      onSubmitted(id);
    } catch (err) {
      setSubmitState("error");
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
      return;
    }
    setSubmitState("idle");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl"
        style={{ background: brand.navy }}
      >
        {/* Header */}
        <div className="relative shrink-0 overflow-hidden px-5 pb-5 pt-5 sm:px-6">
          <div
            className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full opacity-30 blur-2xl"
            style={{ background: brand.coral }}
          />
          <div
            className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full opacity-20 blur-2xl"
            style={{ background: brand.magenta }}
          />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ks-text-muted)" }}>
                Write a verified review
              </p>
              <h2 id="review-modal-title" className="mt-1 text-xl font-bold" style={{ color: brand.white }}>
                {propertyName}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full p-1.5 text-[var(--ks-text-muted)] transition-colors hover:bg-white/10"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
          <div className="relative mt-3 flex items-center gap-1.5 text-xs" style={{ color: "var(--ks-text-muted)" }}>
            <ShieldCheck size={14} style={{ color: brand.success }} />
            Reviews publish only after moderation.
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 sm:px-6">
          <section>
            <h3 className="mb-2 text-sm font-semibold text-[var(--ks-text)]">How do you know this business?</h3>
            <div className="flex flex-wrap gap-2">
              {relationships.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRelationship(r)}
                  className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
                  style={
                    relationship === r
                      ? { background: brand.white, color: "oklch(15% 0.02 260)", borderColor: brand.white }
                      : { borderColor: "var(--ks-border-strong)", color: "var(--ks-text-muted)" }
                  }
                >
                  {RELATIONSHIP_LABELS[r]}
                </button>
              ))}
            </div>
          </section>

          {relationship && !questionSet && !loadError && (
            <p className="mt-6 flex items-center gap-2 text-xs text-[var(--ks-text-muted)]">
              <Loader2 size={14} className="animate-spin" /> Loading questions…
            </p>
          )}
          {loadError && (
            <p className="mt-6 text-xs" style={{ color: brand.danger }}>
              {loadError}
            </p>
          )}

          {questionSet && (
            <>
              <hr className="my-5 border-0 border-t" style={{ borderColor: "var(--ks-border)" }} />

              <section>
                <h3 className="mb-1 text-sm font-semibold text-[var(--ks-text)]">Rate your experience</h3>
                <p className="mb-2 text-xs text-[var(--ks-text-muted)]">
                  1 star = a serious problem, 5 stars = no complaints.
                </p>
                <div className="divide-y" style={{ borderColor: "var(--ks-border)" }}>
                  {starQuestions.map((q) => (
                    <CategoryScoreSlider
                      key={q.id}
                      questionKey={q.key}
                      label={q.label}
                      helpText={q.helpText}
                      value={(answers[q.id] as number) ?? 3}
                      onChange={(v) => setAnswer(q.id, v)}
                    />
                  ))}
                </div>
              </section>

              {factQuestions.length > 0 && (
                <>
                  <hr className="my-5 border-0 border-t" style={{ borderColor: "var(--ks-border)" }} />
                  <section className="flex flex-col gap-4">
                    <h3 className="text-sm font-semibold text-[var(--ks-text)]">A few quick facts</h3>
                    {factQuestions.map((q) => (
                      <FactQuestion key={q.id} question={q} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} />
                    ))}
                  </section>
                </>
              )}

              <hr className="my-5 border-0 border-t" style={{ borderColor: "var(--ks-border)" }} />

              <section>
                <ReasonsEditor reasons={reasons} topics={starQuestions} onChange={setReasons} />
              </section>

              <hr className="my-5 border-0 border-t" style={{ borderColor: "var(--ks-border)" }} />

              <section>
                <ProofUploadSection
                  key={questionSet.id}
                  mediaRequired={questionSet.mediaRequired}
                  proofRequired={questionSet.proofRequired}
                  defaultProofType={isHousing ? "UPI_TRANSACTION" : "INVOICE_RECEIPT"}
                  onMediaChange={setMediaStorageKeys}
                  onProofChange={setProofEntries}
                />
              </section>

              <label className="mt-5 flex items-start gap-2 text-xs text-[var(--ks-text-muted)]">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Post anonymously. Your name and initial are hidden, and the review won&apos;t appear on your public
                  profile.
                  {relationship === "EMPLOYEE" && " Recommended for employee reviews."}
                </span>
              </label>

              {problems.length > 0 && (startedReasons.length > 0 || mediaStorageKeys.length > 0) && (
                <p className="mt-4 text-xs" style={{ color: brand.danger }}>
                  {startedReasons.some((r) => r.text.trim().length < MIN_REASON_LENGTH)
                    ? `One of your reasons is under ${MIN_REASON_LENGTH} characters — finish it or remove it.`
                    : startedReasons.length < MIN_REASONS
                    ? `Add at least ${MIN_REASONS} reasons with ${MIN_REASON_LENGTH}+ characters each.`
                    : problems[0]}
                </p>
              )}
            </>
          )}

          {submitError && (
            <p className="mt-3 text-xs" style={{ color: brand.danger }}>
              {submitError}
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          className="shrink-0 border-t px-5 py-4 sm:px-6"
          style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-input)" }}
        >
          <button
            type="button"
            onClick={handleSubmit}
            disabled={problems.length > 0 || submitState === "submitting"}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-slate-950 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: brandGradient }}
          >
            {submitState === "submitting" && <Loader2 size={16} className="animate-spin" />}
            {submitState === "submitting" ? "Submitting for review…" : "Submit review"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FactQuestion({
  question,
  value,
  onChange,
}: {
  question: QuestionDTO;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue | null) => void;
}) {
  const label = (
    <span className="text-sm text-[var(--ks-text)]">
      {question.label}
      {!question.required && <span className="ml-1 text-xs text-[var(--ks-text-faint)]">(optional)</span>}
      {question.helpText && <span className="block text-[11px] text-[var(--ks-text-faint)]">{question.helpText}</span>}
    </span>
  );
  const chip = (text: string, active: boolean, onClick: () => void) => (
    <button
      key={text}
      type="button"
      onClick={onClick}
      className="rounded-full border px-3 py-1 text-xs font-medium"
      style={
        active
          ? { background: brand.white, color: "oklch(15% 0.02 260)", borderColor: brand.white }
          : { borderColor: "var(--ks-border-strong)", color: "var(--ks-text-muted)" }
      }
    >
      {text}
    </button>
  );

  if (question.type === "YES_NO") {
    return (
      <div className="flex flex-col gap-2">
        {label}
        <div className="flex gap-2">
          {chip("Yes", value === true, () => onChange(value === true ? null : true))}
          {chip("No", value === false, () => onChange(value === false ? null : false))}
        </div>
      </div>
    );
  }
  if (question.type === "SINGLE_CHOICE") {
    return (
      <div className="flex flex-col gap-2">
        {label}
        <div className="flex flex-wrap gap-2">
          {question.options.map((opt) => chip(opt, value === opt, () => onChange(value === opt ? null : opt)))}
        </div>
      </div>
    );
  }
  return (
    <label className="flex flex-col gap-2">
      {label}
      <input
        type="number"
        min={0}
        value={typeof value === "number" ? value : ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="w-40 rounded-md border bg-transparent px-2.5 py-1.5 text-sm text-[var(--ks-text)]"
        style={{ borderColor: "var(--ks-border)" }}
      />
    </label>
  );
}
