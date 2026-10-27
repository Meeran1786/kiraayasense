"use client";

import { useMemo, useState } from "react";
import { X, Loader2, ShieldCheck } from "lucide-react";
import { CategoryScoreSlider } from "./CategoryScoreSlider";
import { ReasonsEditor } from "./ReasonsEditor";
import { ProofUploadSection } from "./ProofUploadSection";
import {
  GRIEVANCE_CATEGORIES,
  MIN_REASONS,
  MIN_REASON_LENGTH,
  reviewSubmissionSchema,
  type CategoryScoreDraft,
  type GrievanceCategoryKey,
  type ProofType,
  type ReasonDraft,
} from "@/lib/reviewValidation";
import { brand, brandGradient } from "@/lib/brand";

interface ReviewSubmissionModalProps {
  propertyId: string;
  propertyName: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: (reviewId: string) => void;
}

type ProofEntry = { proofType: ProofType; storageKey: string; consented: true };

function defaultCategoryScores(): CategoryScoreDraft[] {
  return GRIEVANCE_CATEGORIES.map((c) => ({ category: c.key, score: 3 }));
}

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `reason-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ReviewSubmissionModal({
  propertyId,
  propertyName,
  isOpen,
  onClose,
  onSubmitted,
}: ReviewSubmissionModalProps) {
  const [categoryScores, setCategoryScores] = useState<CategoryScoreDraft[]>(defaultCategoryScores());
  const [reasons, setReasons] = useState<ReasonDraft[]>([
    { id: makeId(), type: "CON", category: GRIEVANCE_CATEGORIES[0].key, text: "" },
    { id: makeId(), type: "CON", category: GRIEVANCE_CATEGORIES[0].key, text: "" },
    { id: makeId(), type: "PRO", category: GRIEVANCE_CATEGORIES[0].key, text: "" },
  ]);
  const [mediaStorageKeys, setMediaStorageKeys] = useState<string[]>([]);
  const [proofEntries, setProofEntries] = useState<ProofEntry[]>([]);
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateScore = (category: GrievanceCategoryKey, score: number) => {
    setCategoryScores((prev) => prev.map((c) => (c.category === category ? { ...c, score } : c)));
  };

  // Reason rows the user has started (i.e. typed at least one character into).
  // A pristine, still-empty row is just an unused slot from "+ Add reason" or
  // an unfilled default — it should not count against the minimum and must
  // NOT be sent to the schema, or z.string().min(20) will reject the whole
  // array over a field the user hasn't touched yet.
  const startedReasons = useMemo(() => reasons.filter((r) => r.text.trim().length > 0), [reasons]);

  const validation = useMemo(
    () =>
      reviewSubmissionSchema.safeParse({
        propertyId,
        categoryScores,
        reasons: startedReasons.map(({ id, ...rest }) => rest),
        mediaStorageKeys,
        proofStorageKeys: proofEntries,
      }),
    [propertyId, categoryScores, startedReasons, mediaStorageKeys, proofEntries]
  );

  // Note: ProofUploadSection tracks its own per-file upload progress internally;
  // the submit button's disabled state derives purely from `validation.success`,
  // which only turns true once storageKeys are populated — i.e. once uploads
  // that are still in flight have not yet been counted as attached.

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!validation.success) return;
    setSubmitState("submitting");
    setSubmitError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
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
            Reviews publish only after moderation and proof verification.
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 sm:px-6">
          <section>
            <h3 className="mb-1 text-sm font-semibold text-[var(--ks-text)]">Rate each category</h3>
            <p className="mb-2 text-xs text-[var(--ks-text-muted)]">
              1 star = a serious problem, 5 stars = no complaints.
            </p>
            <div className="divide-y" style={{ borderColor: "var(--ks-border)" }}>
              {GRIEVANCE_CATEGORIES.map((c) => (
                <CategoryScoreSlider
                  key={c.key}
                  categoryKey={c.key}
                  label={c.label}
                  value={categoryScores.find((s) => s.category === c.key)?.score ?? 3}
                  onChange={(v) => updateScore(c.key, v)}
                />
              ))}
            </div>
          </section>

          <hr className="my-5 border-0 border-t" style={{ borderColor: "var(--ks-border)" }} />

          <section>
            <ReasonsEditor reasons={reasons} onChange={setReasons} />
          </section>

          <hr className="my-5 border-0 border-t" style={{ borderColor: "var(--ks-border)" }} />

          <section>
            <ProofUploadSection onMediaChange={setMediaStorageKeys} onProofChange={setProofEntries} />
          </section>

          {!validation.success && (reasons.some((r) => r.text.length > 0) || mediaStorageKeys.length > 0) && (
            <p className="mt-4 text-xs" style={{ color: brand.danger }}>
              {mediaStorageKeys.length === 0
                ? "Add at least one photo or video walkthrough to continue."
                : proofEntries.length === 0
                ? "Add and consent to at least one payment proof to continue."
                : startedReasons.some((r) => r.text.trim().length < MIN_REASON_LENGTH)
                ? `One of your reasons is under ${MIN_REASON_LENGTH} characters — finish it or remove it (see the highlighted box above).`
                : startedReasons.filter((r) => r.text.trim().length >= MIN_REASON_LENGTH).length < MIN_REASONS
                ? `Add at least ${MIN_REASONS} reasons with ${MIN_REASON_LENGTH}+ characters each.`
                : "Check the highlighted fields above."}
            </p>
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
            disabled={!validation.success || submitState === "submitting"}
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
