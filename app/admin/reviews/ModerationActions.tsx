"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { brand, brandGradient } from "@/lib/brand";

interface ProofLink {
  id: string;
  label: string;
  href: string;
}

export function ModerationActions({ reviewId, proofs }: { reviewId: string; proofs: ProofLink[] }) {
  const router = useRouter();
  const [approvedProofIds, setApprovedProofIds] = useState<string[]>([]);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decide = async (body: object) => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/reviews/${reviewId}/decision`, {
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
  };

  return (
    <div className="mt-5 flex flex-col gap-3 border-t pt-4" style={{ borderColor: "var(--ks-border)" }}>
      {proofs.length === 0 ? (
        <p className="text-xs text-[var(--ks-text-faint)]">No proof attached.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {proofs.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-xs text-[var(--ks-text-muted)]">
              <input
                type="checkbox"
                checked={approvedProofIds.includes(p.id)}
                onChange={(e) =>
                  setApprovedProofIds((prev) => (e.target.checked ? [...prev, p.id] : prev.filter((x) => x !== p.id)))
                }
              />
              Genuine and matches this business:{" "}
              <a href={p.href} target="_blank" className="underline">
                {p.label}
              </a>
            </label>
          ))}
        </div>
      )}

      {rejecting && (
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder="Reason sent to the reviewer (at least 10 characters)"
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
              onClick={() => decide({ decision: "APPROVE", approvedProofIds })}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-50"
              style={{ background: brandGradient }}
            >
              {busy && <Loader2 size={14} className="animate-spin" />}
              Approve and publish
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
              Reject review
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
