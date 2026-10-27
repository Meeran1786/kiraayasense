"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { brandGradient } from "@/lib/brand";

export interface BannerFormValues {
  id?: string;
  title: string;
  imageStorageKey: string;
  clickThroughUrl: string;
  placement: "HOME_HERO" | "LOCALITY_PAGE" | "SEARCH_INTERSTITIAL";
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED";
  targetImpressions: number;
  startAt: string;
  endAt: string;
  advertiserName: string;
  advertiserContact: string;
}

const EMPTY: BannerFormValues = {
  title: "",
  imageStorageKey: "",
  clickThroughUrl: "",
  placement: "HOME_HERO",
  status: "DRAFT",
  targetImpressions: 10000,
  startAt: new Date().toISOString().slice(0, 10),
  endAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  advertiserName: "",
  advertiserContact: "",
};

export function BannerForm({ initial }: { initial?: Partial<BannerFormValues> }) {
  const router = useRouter();
  const [values, setValues] = useState<BannerFormValues>({ ...EMPTY, ...initial });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof BannerFormValues>(key: K, val: BannerFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { id, ...payload } = values;
    const res = await fetch(id ? `/api/admin/banners/${id}` : "/api/admin/banners", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, targetImpressions: Number(payload.targetImpressions) }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "Could not save this banner — check the fields above.");
      return;
    }
    router.push("/admin/banners");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-4">
      <Field label="Title">
        <input required value={values.title} onChange={(e) => set("title", e.target.value)} className={inputCls} />
      </Field>

      <Field label="Image storage key or URL" hint="Path/URL to the banner creative (no image pipeline yet — paste a hosted image URL, e.g. from Unsplash, for testing).">
        <input required value={values.imageStorageKey} onChange={(e) => set("imageStorageKey", e.target.value)} className={inputCls} />
      </Field>

      <Field label="Click-through URL">
        <input
          required
          type="url"
          value={values.clickThroughUrl}
          onChange={(e) => set("clickThroughUrl", e.target.value)}
          className={inputCls}
          placeholder="https://..."
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Placement">
          <select value={values.placement} onChange={(e) => set("placement", e.target.value as BannerFormValues["placement"])} className={inputCls}>
            <option value="HOME_HERO">Home hero</option>
            <option value="LOCALITY_PAGE">Locality page</option>
            <option value="SEARCH_INTERSTITIAL">Search interstitial</option>
          </select>
        </Field>
        <Field label="Status">
          <select value={values.status} onChange={(e) => set("status", e.target.value as BannerFormValues["status"])} className={inputCls}>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Start date">
          <input type="date" value={values.startAt.slice(0, 10)} onChange={(e) => set("startAt", e.target.value)} className={inputCls} />
        </Field>
        <Field label="End date">
          <input type="date" value={values.endAt.slice(0, 10)} onChange={(e) => set("endAt", e.target.value)} className={inputCls} />
        </Field>
      </div>

      <Field label="Target impressions">
        <input
          type="number"
          min={1}
          value={values.targetImpressions}
          onChange={(e) => set("targetImpressions", Number(e.target.value))}
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Advertiser name">
          <input required value={values.advertiserName} onChange={(e) => set("advertiserName", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Advertiser contact (optional)">
          <input value={values.advertiserContact} onChange={(e) => set("advertiserContact", e.target.value)} className={inputCls} />
        </Field>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="mt-2 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50"
        style={{ background: brandGradient }}
      >
        {busy && <Loader2 size={16} className="animate-spin" />}
        {values.id ? "Save changes" : "Create banner"}
      </button>
    </form>
  );
}

const inputCls =
  "rounded-lg border border-[var(--ks-border-strong)] bg-transparent px-3 py-2 text-sm text-[var(--ks-text)] focus:outline-none";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-[var(--ks-text-muted)]">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-[var(--ks-text-faint)]">{hint}</span>}
    </label>
  );
}
