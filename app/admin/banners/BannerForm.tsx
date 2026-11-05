"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
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
  sortOrder: number;
}

const EMPTY: BannerFormValues = {
  title: "",
  imageStorageKey: "",
  clickThroughUrl: "",
  placement: "HOME_HERO",
  status: "DRAFT",
  targetImpressions: 10000,
  startAt: new Date().toISOString().slice(0, 10),
  endAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  advertiserName: "",
  advertiserContact: "",
  sortOrder: 1,
};

/** Same rule as lib/banners.ts bannerImageUrl (that file is server-only because it imports Prisma). */
function previewUrl(key: string): string | null {
  if (/^https:\/\//.test(key)) return key;
  if (/^banners\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(key)) return `/uploads/${key}`;
  return null;
}

export function BannerForm({ initial }: { initial?: Partial<BannerFormValues> }) {
  const router = useRouter();
  const [values, setValues] = useState<BannerFormValues>({ ...EMPTY, ...initial });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const set = <K extends keyof BannerFormValues>(key: K, val: BannerFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: val }));

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/banners/upload", { method: "POST", body: form });
    const body = await res.json().catch(() => null);
    setUploading(false);
    if (!res.ok || !body?.storageKey) {
      setError(body?.error?.message ?? "Upload failed. Try again.");
      return;
    }
    set("imageStorageKey", body.storageKey);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { id, ...payload } = values;
    const res = await fetch(id ? `/api/admin/banners/${id}` : "/api/admin/banners", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        targetImpressions: Number(payload.targetImpressions),
        sortOrder: Number(payload.sortOrder),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const fields = body?.error?.fieldErrors as Record<string, string[]> | undefined;
      const detail = fields ? Object.entries(fields).map(([k, v]) => `${k}: ${v.join(", ")}`).join("; ") : null;
      setError(body?.error?.message ?? detail ?? "Could not save this banner. Check the fields above.");
      return;
    }
    router.push("/admin/banners");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-4">
      <Field label="Title" hint="Also read out by screen readers, so describe the ad, e.g. “Acme Interiors: 20% off modular kitchens”.">
        <input required value={values.title} onChange={(e) => set("title", e.target.value)} className={inputCls} />
      </Field>

      <Field
        label="Banner image"
        hint="Wide image, 1600 × 400 px (4:1), JPG, PNG or WebP under 3 MB. It shows at the same 4:1 shape on every screen, about 90 px tall on a phone, so use large text and few words. Or paste an https image URL."
      >
        <div className="flex flex-col gap-2">
          {previewUrl(values.imageStorageKey) && (
            // eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded or pasted image
            <img
              src={previewUrl(values.imageStorageKey)!}
              alt=""
              className="aspect-[4/1] w-full rounded-lg border object-cover"
              style={{ borderColor: "var(--ks-border)" }}
            />
          )}
          <div className="flex gap-2">
            <input
              required
              value={values.imageStorageKey}
              onChange={(e) => set("imageStorageKey", e.target.value)}
              className={`${inputCls} min-w-0 flex-1`}
              placeholder="Upload, or paste https://…"
            />
            <label
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold text-[var(--ks-text)] hover:bg-white/5"
              style={{ borderColor: "var(--ks-border-strong)" }}
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              Upload
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleUpload(e.target.files?.[0])}
              />
            </label>
          </div>
        </div>
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
            <option value="HOME_HERO">Home page carousel</option>
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

      <Field label="Carousel position" hint="Lower numbers show first. The home page shows up to 6 active banners.">
        <input
          type="number"
          min={0}
          max={999}
          value={values.sortOrder}
          onChange={(e) => set("sortOrder", Number(e.target.value))}
          className={inputCls}
        />
      </Field>

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
