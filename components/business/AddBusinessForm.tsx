"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, MapPin } from "lucide-react";
import { brand, brandGradient } from "@/lib/brand";
import { businessSubmissionSchema, INDIAN_STATES, type SimilarBusiness } from "@/lib/businessSubmission";
import type { CategoryNode } from "@/lib/db/categories";

interface Suggestion {
  placeId: string;
  main: string;
  secondary: string;
}

const EMPTY = {
  name: "",
  categoryId: "",
  doorNumber: "",
  street: "",
  locality: "",
  district: "",
  state: "",
  pincode: "",
  website: "",
  googleMapsUrl: "",
};

export function AddBusinessForm({ categories, initialName }: { categories: CategoryNode[]; initialName: string }) {
  const [form, setForm] = useState({ ...EMPTY, name: initialName });
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [similar, setSimilar] = useState<SimilarBusiness[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [placesEnabled, setPlacesEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  // Google bills autocomplete per session; one token per business added.
  const session = useRef(crypto.randomUUID());

  const set = (key: keyof typeof EMPTY, value: string) => setForm((f) => ({ ...f, [key]: value }));

  // "Is it one of these?" once there's a name and a pincode.
  useEffect(() => {
    setConfirmed(false);
    if (form.name.trim().length < 3 || !/^[1-9]\d{5}$/.test(form.pincode)) {
      setSimilar([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/businesses/similar?name=${encodeURIComponent(form.name)}&pincode=${form.pincode}`);
      if (res.ok) setSimilar((await res.json()).businesses);
    }, 400);
    return () => clearTimeout(t);
  }, [form.name, form.pincode]);

  // Google Places suggestions, only when the server has a key configured.
  useEffect(() => {
    if (!placesEnabled || placeId || form.name.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(form.name)}&session=${session.current}`);
      const body = await res.json().catch(() => null);
      if (body?.enabled === false) setPlacesEnabled(false);
      setSuggestions(body?.suggestions ?? []);
    }, 500);
    return () => clearTimeout(t);
  }, [form.name, placeId, placesEnabled]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = businessSubmissionSchema.safeParse({ ...form, googlePlaceId: placeId, confirmNotDuplicate: confirmed });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/businesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    const body = await res.json().catch(() => null);
    setBusy(false);
    if (res.status === 409 && body?.similar) {
      setSimilar(body.similar);
      setError("This looks like a business we already list. Check the matches above.");
      return;
    }
    if (!res.ok) {
      setError(body?.error?.message ?? "Could not add the business");
      return;
    }
    setCreatedId(body.property.id);
  };

  if (createdId) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border p-5" style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}>
        <p className="flex items-center gap-2 font-semibold text-[var(--ks-text)]">
          <CheckCircle2 size={18} style={{ color: brand.success }} /> Thanks, we&apos;ll check it
        </p>
        <p className="text-sm text-[var(--ks-text-muted)]">
          A moderator confirms new businesses before they appear, usually within 2 working days. You can review it as soon
          as it&apos;s live.
        </p>
        <Link href="/" className="text-sm text-[var(--ks-text-muted)] underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-xl border p-5" style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}>
      <Field label="Business name">
        <input
          value={form.name}
          onChange={(e) => {
            set("name", e.target.value);
            setPlaceId(null);
          }}
          className={inputCls}
          autoFocus
        />
      </Field>
      {placeId && (
        <p className="-mt-2 flex items-center gap-1 text-xs" style={{ color: brand.success }}>
          <MapPin size={12} /> Linked to Google Maps.{" "}
          <button type="button" className="underline" onClick={() => setPlaceId(null)}>
            Unlink
          </button>
        </p>
      )}
      {suggestions.length > 0 && (
        <div className="-mt-2 rounded-lg border text-sm" style={{ borderColor: "var(--ks-border)" }}>
          <p className="px-3 pt-2 text-[11px] text-[var(--ks-text-faint)]">Is it one of these on Google Maps? (optional)</p>
          {suggestions.map((s) => (
            <button
              key={s.placeId}
              type="button"
              onClick={() => {
                setPlaceId(s.placeId);
                setSuggestions([]);
                session.current = crypto.randomUUID();
              }}
              className="block w-full px-3 py-1.5 text-left hover:bg-white/5"
            >
              <span className="text-[var(--ks-text)]">{s.main}</span>{" "}
              <span className="text-xs text-[var(--ks-text-faint)]">{s.secondary}</span>
            </button>
          ))}
        </div>
      )}

      <Field label="Category">
        <select value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)} className={inputCls}>
          <option value="">Pick the closest match</option>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Building / door no. (optional)">
          <input value={form.doorNumber} onChange={(e) => set("doorNumber", e.target.value)} className={inputCls} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Street (optional)">
            <input value={form.street} onChange={(e) => set("street", e.target.value)} className={inputCls} />
          </Field>
        </div>
        <Field label="Area / locality">
          <input value={form.locality} onChange={(e) => set("locality", e.target.value)} placeholder="e.g. HSR Layout" className={inputCls} />
        </Field>
        <Field label="City / district">
          <input value={form.district} onChange={(e) => set("district", e.target.value)} placeholder="e.g. Bengaluru Urban" className={inputCls} />
        </Field>
        <Field label="Pincode">
          <input
            value={form.pincode}
            onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            className={inputCls}
          />
        </Field>
      </div>
      <Field label="State">
        <select value={form.state} onChange={(e) => set("state", e.target.value)} className={inputCls}>
          <option value="">Pick a state</option>
          {INDIAN_STATES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>

      {similar.length > 0 && (
        <div className="rounded-lg border p-3 text-sm" style={{ borderColor: brand.warn }}>
          <p className="font-medium text-[var(--ks-text)]">We may already list this business:</p>
          <ul className="mt-1 flex flex-col gap-1">
            {similar.map((b) => (
              <li key={b.id}>
                <Link href={`/property/${b.id}`} className="text-[var(--ks-text)] underline">
                  {b.name}
                </Link>{" "}
                <span className="text-xs text-[var(--ks-text-faint)]">
                  {b.category} · {b.locality}
                </span>
              </li>
            ))}
          </ul>
          <label className="mt-2 flex items-center gap-2 text-xs text-[var(--ks-text-muted)]">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            Mine is a different business
          </label>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Website (optional)">
          <input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" className={inputCls} />
        </Field>
        <Field label="Google Maps link (optional)">
          <input
            value={form.googleMapsUrl}
            onChange={(e) => set("googleMapsUrl", e.target.value)}
            placeholder="https://maps.app.goo.gl/…"
            className={inputCls}
          />
        </Field>
      </div>

      {error && <p className="text-xs" style={{ color: brand.danger }}>{error}</p>}
      <button
        type="submit"
        disabled={busy || (similar.length > 0 && !confirmed)}
        className="flex items-center justify-center gap-2 self-start rounded-xl px-5 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50"
        style={{ background: brandGradient }}
      >
        {busy && <Loader2 size={14} className="animate-spin" />}
        Add business
      </button>
    </form>
  );
}

const inputCls =
  "w-full rounded-lg border border-[var(--ks-border-strong)] bg-transparent px-3 py-2 text-sm text-[var(--ks-text)] focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-[var(--ks-text-muted)]">{label}</span>
      {children}
    </label>
  );
}
