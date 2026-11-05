"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { brand, brandGradient } from "@/lib/brand";

/** Approve / reject buttons for an owner's reply. */
export function ReplyDecision({ replyId }: { replyId: string }) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(body: object) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/responses/${replyId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error?.message ?? "Could not save the decision");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {rejecting && (
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder="Note shown to the owner (at least 10 characters)"
          className="rounded-md border bg-transparent px-2.5 py-2 text-sm text-[var(--ks-text)]"
          style={{ borderColor: "var(--ks-border)" }}
        />
      )}
      {error && <p className="text-xs" style={{ color: brand.danger }}>{error}</p>}
      <div className="flex gap-2">
        {!rejecting ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => decide({ decision: "APPROVE" })}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-50"
              style={{ background: brandGradient }}
            >
              {busy && <Loader2 size={14} className="animate-spin" />}
              Publish reply
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setRejecting(true)}
              className="rounded-xl border border-[var(--ks-border-strong)] px-4 py-2 text-xs font-semibold text-[var(--ks-text)]"
            >
              Reject…
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={busy || reason.trim().length < 10}
              onClick={() => decide({ decision: "REJECT", reason })}
              className="rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50"
              style={{ background: brand.danger, color: "white" }}
            >
              Reject reply
            </button>
            <button type="button" onClick={() => setRejecting(false)} className="text-xs text-[var(--ks-text-muted)]">
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
