"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquareReply } from "lucide-react";
import { brandGradient } from "@/lib/brand";

export interface ReplyState {
  text: string;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
}

const STATUS_TEXT: Record<ReplyState["status"], string> = {
  PENDING_REVIEW: "Waiting for a moderator. It will appear on your page once approved, usually within a day.",
  APPROVED: "Published on your page.",
  REJECTED: "Not published.",
};

/** The manager's one public reply to a review: write, edit or withdraw. */
export function ReplyBox({ reviewId, initial }: { reviewId: string; initial: ReplyState | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(initial?.text ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(method: "PUT" | "DELETE") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/response`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "PUT" ? JSON.stringify({ text }) : undefined,
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message ?? "Couldn't save your reply. Try again.");
        return;
      }
      if (method === "DELETE") setText("");
      setEditing(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    if (!initial) {
      return (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-3 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold text-[var(--ks-text)]"
          style={{ borderColor: "var(--ks-border-strong)" }}
        >
          <MessageSquareReply size={13} /> Reply publicly
        </button>
      );
    }
    return (
      <div className="mt-3 rounded-lg border-l-2 px-3 py-2 text-xs" style={{ borderColor: "var(--ks-coral)", background: "var(--ks-bg-elevated-2)" }}>
        <p className="font-semibold text-[var(--ks-text-muted)]">Your reply</p>
        <p className="mt-1 whitespace-pre-line text-[var(--ks-text-muted)]">{initial.text}</p>
        <p className="mt-2 text-[11px]" style={{ color: initial.status === "REJECTED" ? "var(--ks-danger)" : "var(--ks-text-faint)" }}>
          {STATUS_TEXT[initial.status]}
          {initial.status === "REJECTED" && initial.rejectionReason ? ` Moderator's note: ${initial.rejectionReason}` : ""}
        </p>
        <div className="mt-2 flex gap-3">
          <button type="button" onClick={() => setEditing(true)} className="font-medium text-[var(--ks-text)] underline">
            Edit
          </button>
          <button type="button" disabled={busy} onClick={() => send("DELETE")} className="text-[var(--ks-text-muted)] underline">
            Withdraw
          </button>
        </div>
        {error && <p className="mt-1" style={{ color: "var(--ks-danger)" }}>{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        maxLength={1000}
        placeholder="Thank the reviewer, answer the points they raise, and say what you've changed. Stay polite and don't share their personal details."
        className="rounded-md border bg-transparent px-2.5 py-2 text-sm text-[var(--ks-text)]"
        style={{ borderColor: "var(--ks-border)" }}
      />
      <p className="text-[11px] text-[var(--ks-text-faint)]">
        {text.trim().length}/1000. A moderator checks every reply before it goes live.
      </p>
      {error && <p className="text-xs" style={{ color: "var(--ks-danger)" }}>{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || text.trim().length < 10}
          onClick={() => send("PUT")}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-950 disabled:opacity-50"
          style={{ background: brandGradient }}
        >
          {busy && <Loader2 size={12} className="animate-spin" />}
          Send for approval
        </button>
        <button type="button" onClick={() => setEditing(false)} className="text-xs text-[var(--ks-text-muted)]">
          Cancel
        </button>
      </div>
    </div>
  );
}
