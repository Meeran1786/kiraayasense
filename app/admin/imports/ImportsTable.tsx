"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { brand, brandGradient } from "@/lib/brand";

export interface ImportRow {
  id: string;
  startedAt: string;
  source: string;
  area: string;
  status: string;
  created: number;
  updated: number;
  merged: number;
  skipped: number;
  pending: number;
}

/** Import batches with tick boxes, so many can be published or rejected in one go. */
export function ImportsTable({ rows }: { rows: ImportRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectable = rows.filter((r) => r.pending > 0);
  const allSelected = selectable.length > 0 && selectable.every((r) => selected.has(r.id));
  const pendingSelected = rows.filter((r) => selected.has(r.id)).reduce((n, r) => n + r.pending, 0);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectable.map((r) => r.id)));

  const act = async (action: "PUBLISH" | "REJECT") => {
    const verb = action === "PUBLISH" ? "Publish" : "Reject";
    if (!confirm(`${verb} ${pendingSelected.toLocaleString("en-IN")} listings from ${selected.size} batches?`)) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/admin/imports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, jobIds: [...selected] }),
    });
    const body = await res.json().catch(() => null);
    setBusy(false);
    setMessage(res.ok ? `${body.updated.toLocaleString("en-IN")} listings updated` : body?.error?.message ?? "Something went wrong");
    setSelected(new Set());
    router.refresh();
  };

  return (
    <div className="mt-6">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => act("PUBLISH")}
          disabled={busy || selected.size === 0}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
          style={{ background: brandGradient }}
        >
          {busy && <Loader2 size={14} className="animate-spin" />}
          Publish selected{selected.size ? ` (${pendingSelected.toLocaleString("en-IN")} listings)` : ""}
        </button>
        <button
          type="button"
          onClick={() => act("REJECT")}
          disabled={busy || selected.size === 0}
          className="rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50"
          style={{ borderColor: "var(--ks-border-strong)", color: brand.danger }}
        >
          Reject selected
        </button>
        {message && <span className="text-xs text-[var(--ks-text-muted)]">{message}</span>}
      </div>

      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--ks-border)" }}>
        <table className="w-full text-left text-sm">
          <thead style={{ background: "var(--ks-bg-elevated)" }}>
            <tr className="text-xs uppercase tracking-wide text-[var(--ks-text-faint)]">
              <th className="px-4 py-2.5">
                <input
                  type="checkbox"
                  aria-label="Select every batch awaiting review"
                  checked={allSelected}
                  disabled={selectable.length === 0}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-4 py-2.5">Started</th>
              <th className="px-4 py-2.5">Source</th>
              <th className="px-4 py-2.5">Area</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Awaiting review</th>
              <th className="px-4 py-2.5 text-right">New</th>
              <th className="px-4 py-2.5 text-right">Refreshed</th>
              <th className="px-4 py-2.5 text-right">Matched</th>
              <th className="px-4 py-2.5 text-right">Skipped</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-[var(--ks-text-faint)]">
                  No imports yet.
                </td>
              </tr>
            )}
            {rows.map((j) => (
              <tr key={j.id} className="border-t" style={{ borderColor: "var(--ks-border)" }}>
                <td className="px-4 py-2.5">
                  <input
                    type="checkbox"
                    aria-label={`Select ${j.area}`}
                    checked={selected.has(j.id)}
                    disabled={j.pending === 0}
                    onChange={() => toggle(j.id)}
                  />
                </td>
                <td className="px-4 py-2.5">
                  <Link href={`/admin/imports/${j.id}`} className="text-[var(--ks-text)] hover:underline">
                    {new Date(j.startedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-[var(--ks-text-muted)]">{j.source}</td>
                <td className="px-4 py-2.5 text-[var(--ks-text-muted)]">{j.area}</td>
                <td className="px-4 py-2.5 text-[var(--ks-text-muted)]">{j.status}</td>
                <td className="px-4 py-2.5 text-right text-[var(--ks-text)]">{j.pending.toLocaleString("en-IN")}</td>
                <td className="px-4 py-2.5 text-right text-[var(--ks-text-muted)]">{j.created}</td>
                <td className="px-4 py-2.5 text-right text-[var(--ks-text-muted)]">{j.updated}</td>
                <td className="px-4 py-2.5 text-right text-[var(--ks-text-muted)]">{j.merged}</td>
                <td className="px-4 py-2.5 text-right text-[var(--ks-text-muted)]">{j.skipped}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
