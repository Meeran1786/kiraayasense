"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { brand, brandGradient } from "@/lib/brand";

export function BatchActions({ jobId, pending }: { jobId: string; pending: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const act = async (action: "PUBLISH" | "REJECT") => {
    const verb = action === "PUBLISH" ? "Publish" : "Reject";
    if (!confirm(`${verb} all ${pending} listings from this batch that are still awaiting review?`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/imports/${jobId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const body = await res.json().catch(() => null);
    setBusy(false);
    setMessage(res.ok ? `${body.updated} listings updated` : body?.error?.message ?? "Something went wrong");
    router.refresh();
  };

  if (pending === 0) return <p className="text-sm text-[var(--ks-text-muted)]">Nothing in this batch is awaiting review.</p>;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => act("PUBLISH")}
        disabled={busy}
        className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
        style={{ background: brandGradient }}
      >
        {busy && <Loader2 size={14} className="animate-spin" />}
        Publish {pending} listings
      </button>
      <button
        type="button"
        onClick={() => act("REJECT")}
        disabled={busy}
        className="rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50"
        style={{ borderColor: "var(--ks-border-strong)", color: brand.danger }}
      >
        Reject batch
      </button>
      {message && <span className="text-xs text-[var(--ks-text-muted)]">{message}</span>}
    </div>
  );
}
