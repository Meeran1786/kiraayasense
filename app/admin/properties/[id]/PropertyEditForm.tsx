"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { brand, brandGradient } from "@/lib/brand";
import type { CategoryNode } from "@/lib/db/categories";

const STATUS_OPTIONS = ["PENDING_VERIFICATION", "APPROVED", "REJECTED", "MERGED", "UNPUBLISHED"] as const;

export interface PropertyEditValues {
  id: string;
  name: string;
  categoryId: string;
  status: string;
  doorNumber: string;
  street: string;
  district: string;
  state: string;
  pincode: string;
  approxRentMin: number;
  approxRentMax: number;
}

export function PropertyEditForm({ initial, categories }: { initial: PropertyEditValues; categories: CategoryNode[] }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof PropertyEditValues>(key: K, val: PropertyEditValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { id, ...payload } = values;
    const res = await fetch(`/api/admin/properties/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        approxRentMin: Number(payload.approxRentMin),
        approxRentMax: Number(payload.approxRentMax),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "Could not save these changes.");
      return;
    }
    setSaved(true);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-4">
      <Field label="Business name">
        <input required value={values.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Category">
          <select value={values.categoryId} onChange={(e) => set("categoryId", e.target.value)} className={inputCls}>
            {categories.map((top) => (
              <optgroup key={top.id} label={top.name}>
                {top.children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select value={values.status} onChange={(e) => set("status", e.target.value)} className={inputCls}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Door / unit number">
        <input value={values.doorNumber} onChange={(e) => set("doorNumber", e.target.value)} className={inputCls} />
      </Field>
      <Field label="Street / address line">
        <input value={values.street} onChange={(e) => set("street", e.target.value)} className={inputCls} />
      </Field>

      <div className="grid grid-cols-3 gap-4">
        <Field label="District">
          <input required value={values.district} onChange={(e) => set("district", e.target.value)} className={inputCls} />
        </Field>
        <Field label="State">
          <input required value={values.state} onChange={(e) => set("state", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Pincode">
          <input required value={values.pincode} onChange={(e) => set("pincode", e.target.value)} className={inputCls} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Approx. rent min (₹/month, housing only)">
          <input
            type="number"
            min={0}
            value={values.approxRentMin}
            onChange={(e) => set("approxRentMin", Number(e.target.value))}
            className={inputCls}
          />
        </Field>
        <Field label="Approx. rent max (₹/month, housing only)">
          <input
            type="number"
            min={0}
            value={values.approxRentMax}
            onChange={(e) => set("approxRentMax", Number(e.target.value))}
            className={inputCls}
          />
        </Field>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {saved && !error && <p className="text-xs" style={{ color: brand.success }}>Saved.</p>}

      <button
        type="submit"
        disabled={busy}
        className="mt-2 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50"
        style={{ background: brandGradient }}
      >
        {busy && <Loader2 size={16} className="animate-spin" />}
        Save changes
      </button>
    </form>
  );
}

const inputCls =
  "rounded-lg border border-[var(--ks-border-strong)] bg-transparent px-3 py-2 text-sm text-[var(--ks-text)] focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-[var(--ks-text-muted)]">{label}</span>
      {children}
    </label>
  );
}
