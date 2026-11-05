"use client";

import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { SignInModal } from "@/components/auth/SignInModal";
import { FLAG_REASONS, type FlagReason } from "@/lib/flags";

/** "Report" link on a published review; opens a short form under the review. */
export function ReportButton({ reviewId }: { reviewId: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [reason, setReason] = useState<FlagReason | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!reason) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details: details.trim() || null }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok || body?.error?.code === "ALREADY_REPORTED") setDone(true);
      else setError(body?.error?.message ?? "Couldn't send the report. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <p className="text-[11px] text-[var(--ks-text-faint)]">Thanks, a moderator will look at this review.</p>;
  }

  return (
    <div className="w-full">
      {!open && (
        <button
          type="button"
          onClick={() => (user ? setOpen(true) : setSignInOpen(true))}
          className="flex items-center gap-1 text-[11px] text-[var(--ks-text-faint)] hover:text-[var(--ks-text-muted)] hover:underline"
        >
          <Flag size={11} /> Report
        </button>
      )}
      {open && (
        <div className="mt-2 flex flex-col gap-2 rounded-lg border p-3 text-xs" style={{ borderColor: "var(--ks-border)" }}>
          <p className="font-semibold text-[var(--ks-text)]">What's wrong with this review?</p>
          {(Object.keys(FLAG_REASONS) as FlagReason[]).map((key) => (
            <label key={key} className="flex items-center gap-2 text-[var(--ks-text-muted)]">
              <input type="radio" name={`flag-${reviewId}`} checked={reason === key} onChange={() => setReason(key)} />
              {FLAG_REASONS[key]}
            </label>
          ))}
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Anything a moderator should know (optional)"
            className="rounded-md border bg-transparent px-2.5 py-2 text-xs text-[var(--ks-text)]"
            style={{ borderColor: "var(--ks-border)" }}
          />
          <p className="text-[11px] text-[var(--ks-text-faint)]">
            Disagreeing with a review isn't a reason to remove it. Moderators keep honest reviews up, good or bad.
          </p>
          {error && <p style={{ color: "var(--ks-danger)" }}>{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!reason || busy}
              onClick={submit}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-semibold text-[var(--ks-text)] disabled:opacity-50"
              style={{ borderColor: "var(--ks-border-strong)" }}
            >
              {busy && <Loader2 size={12} className="animate-spin" />}
              Send report
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-[var(--ks-text-muted)]">
              Cancel
            </button>
          </div>
        </div>
      )}
      <SignInModal
        isOpen={signInOpen}
        onClose={() => setSignInOpen(false)}
        onSignedIn={() => setSignInOpen(false)}
        reason="Sign in to report a review."
      />
    </div>
  );
}
