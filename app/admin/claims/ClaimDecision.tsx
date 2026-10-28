"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { brand, brandGradient } from "@/lib/brand";

export function ClaimDecision({ claimId }: { claimId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decide = async (decision: "APPROVE" | "REJECT") => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/claims/${claimId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, note: note || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "Could not save the decision");
      return;
    }
    router.refresh();
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (what you checked, or why not)"
        className="min-w-0 flex-1 rounded-lg border border-[var(--ks-border-strong)] bg-transparent px-3 py-1.5 text-sm text-[var(--ks-text)]"
      />
      <button
        type="button"
        onClick={() => decide("APPROVE")}
        disabled={busy}
        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-950 disabled:opacity-50"
        style={{ background: brandGradient }}
      >
        {busy && <Loader2 size={13} className="animate-spin" />}
        Approve
      </button>
      <button
        type="button"
        onClick={() => decide("REJECT")}
        disabled={busy}
        className="rounded-lg border px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
        style={{ borderColor: "var(--ks-border-strong)", color: brand.danger }}
      >
        Reject
      </button>
      {error && <span className="w-full text-xs" style={{ color: brand.danger }}>{error}</span>}
    </div>
  );
}
