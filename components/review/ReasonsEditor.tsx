"use client";

import { Plus, Trash2, ThumbsUp, ThumbsDown } from "lucide-react";
import {
  GRIEVANCE_CATEGORIES,
  MIN_REASONS,
  MIN_REASON_LENGTH,
  type ReasonDraft,
} from "@/lib/reviewValidation";
import { brand } from "@/lib/brand";

interface ReasonsEditorProps {
  reasons: ReasonDraft[];
  onChange: (reasons: ReasonDraft[]) => void;
}

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `reason-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ReasonsEditor({ reasons, onChange }: ReasonsEditorProps) {
  const addReason = () => {
    onChange([
      ...reasons,
      { id: makeId(), type: "CON", category: GRIEVANCE_CATEGORIES[0].key, text: "" },
    ]);
  };

  const updateReason = (id: string, patch: Partial<ReasonDraft>) => {
    onChange(reasons.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeReason = (id: string) => {
    onChange(reasons.filter((r) => r.id !== id));
  };

  const validCount = reasons.filter((r) => r.text.trim().length >= MIN_REASON_LENGTH).length;
  const meetsMinimum = validCount >= MIN_REASONS;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--ks-text)]">
          Specific reasons{" "}
          <span className="font-normal text-[var(--ks-text-muted)]">
            (at least {MIN_REASONS} required — {validCount}/{MIN_REASONS} so far)
          </span>
        </h3>
        <button
          type="button"
          onClick={addReason}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-950 transition-opacity hover:opacity-90"
          style={{ background: brand.white }}
        >
          <Plus size={14} strokeWidth={2.5} />
          Add reason
        </button>
      </div>

      {!meetsMinimum && (
        <p className="text-xs" style={{ color: brand.danger }}>
          Add {MIN_REASONS - validCount} more reason{MIN_REASONS - validCount === 1 ? "" : "s"} of at
          least {MIN_REASON_LENGTH} characters each before you can submit.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {reasons.map((reason, idx) => {
          const tooShort = reason.text.trim().length > 0 && reason.text.trim().length < MIN_REASON_LENGTH;
          return (
            <div
              key={reason.id}
              className="rounded-xl border p-3"
              style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated-2)" }}
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-[var(--ks-text-muted)]">#{idx + 1}</span>

                <div className="ml-auto flex overflow-hidden rounded-full border" style={{ borderColor: "var(--ks-border)" }}>
                  <button
                    type="button"
                    onClick={() => updateReason(reason.id, { type: "PRO" })}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold transition-colors"
                    style={
                      reason.type === "PRO"
                        ? { background: brand.success, color: "oklch(15% 0.02 150)" }
                        : { color: "var(--ks-text-muted)" }
                    }
                  >
                    <ThumbsUp size={12} /> Pro
                  </button>
                  <button
                    type="button"
                    onClick={() => updateReason(reason.id, { type: "CON" })}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold transition-colors"
                    style={
                      reason.type === "CON"
                        ? { background: brand.danger, color: "var(--ks-text)" }
                        : { color: "var(--ks-text-muted)" }
                    }
                  >
                    <ThumbsDown size={12} /> Con
                  </button>
                </div>

                <select
                  value={reason.category}
                  onChange={(e) =>
                    updateReason(reason.id, { category: e.target.value as ReasonDraft["category"] })
                  }
                  className="rounded-md border bg-transparent px-2 py-1 text-xs text-[var(--ks-text)]"
                  style={{ borderColor: "var(--ks-border)" }}
                >
                  {GRIEVANCE_CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key} className="bg-[var(--ks-bg-elevated)]">
                      {c.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => removeReason(reason.id)}
                  disabled={reasons.length <= MIN_REASONS}
                  className="ml-1 rounded-md p-1 text-[var(--ks-text-muted)] transition-colors hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Remove reason"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <textarea
                value={reason.text}
                onChange={(e) => updateReason(reason.id, { text: e.target.value })}
                placeholder="Be specific — what happened, and when? (min 20 characters)"
                rows={2}
                className="w-full resize-none rounded-md border bg-transparent px-2.5 py-2 text-sm text-[var(--ks-text)] placeholder:text-[var(--ks-text-faint)] focus:outline-none focus:ring-2"
                style={{
                  borderColor: tooShort ? brand.danger : "var(--ks-border)",
                }}
              />
              <div className="mt-1 flex justify-end">
                <span
                  className="text-[11px]"
                  style={{ color: tooShort ? brand.danger : "var(--ks-text-faint)" }}
                >
                  {reason.text.trim().length}/{MIN_REASON_LENGTH}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
