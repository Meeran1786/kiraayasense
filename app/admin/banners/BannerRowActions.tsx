"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BannerRowActions({ bannerId, status }: { bannerId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    const nextStatus = status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    await fetch(`/api/admin/banners/${bannerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setBusy(false);
    router.refresh();
  };

  const remove = async () => {
    if (!confirm("Delete this banner? This can't be undone.")) return;
    setBusy(true);
    await fetch(`/api/admin/banners/${bannerId}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <button
        type="button"
        disabled={busy}
        onClick={toggle}
        className="rounded-full border px-2.5 py-1 text-[var(--ks-text-muted)] hover:bg-white/5 disabled:opacity-50"
        style={{ borderColor: "var(--ks-border-strong)" }}
      >
        {status === "ACTIVE" ? "Pause" : "Activate"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={remove}
        className="rounded-full border px-2.5 py-1 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
        style={{ borderColor: "var(--ks-border-strong)" }}
      >
        Delete
      </button>
    </div>
  );
}
