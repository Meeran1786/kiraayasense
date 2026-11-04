"use client";

import { useState } from "react";
import { ThumbsUp } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { SignInModal } from "@/components/auth/SignInModal";

/** "Helpful" tap on a review. One per signed-in user; not on your own review. */
export function HelpfulButton({ reviewId, initialCount, initialVoted }: { reviewId: string; initialCount: number; initialVoted: boolean }) {
  const { user } = useAuth();
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(initialVoted);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);

  async function toggle() {
    if (!user) {
      setSignInOpen(true);
      return;
    }
    setBusy(true);
    setError(null);
    const next = !voted;
    try {
      const res = await fetch(`/api/reviews/${reviewId}/helpful`, { method: next ? "POST" : "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message ?? "Couldn't save that. Try again.");
      } else {
        setVoted(body.helpful);
        setCount(body.count);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={voted}
        className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition disabled:opacity-60"
        style={{
          borderColor: voted ? "var(--ks-success)" : "var(--ks-border)",
          color: voted ? "var(--ks-success)" : "var(--ks-text-muted)",
        }}
      >
        <ThumbsUp size={12} className={voted ? "fill-current" : undefined} />
        Helpful{count > 0 ? ` · ${count}` : ""}
      </button>
      {error && <span className="text-[11px]" style={{ color: "var(--ks-danger)" }}>{error}</span>}
      <SignInModal
        isOpen={signInOpen}
        onClose={() => setSignInOpen(false)}
        onSignedIn={() => setSignInOpen(false)}
        reason="Sign in to mark reviews as helpful."
      />
    </div>
  );
}
