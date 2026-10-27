"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { brand, brandGradient } from "@/lib/brand";
import { profileUpdateSchema, type ProfileUpdateInput } from "@/lib/handles";

export function ProfileEditor({ initial }: { initial: ProfileUpdateInput }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [savedHandle, setSavedHandle] = useState(initial.handle);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const set = <K extends keyof ProfileUpdateInput>(key: K, value: ProfileUpdateInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = profileUpdateSchema.safeParse(form);
    if (!parsed.success) {
      setMessage({ ok: false, text: parsed.error.issues[0]?.message ?? "Check the form" });
      return;
    }
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    const body = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setMessage({ ok: false, text: body?.error?.message ?? "Could not save your profile" });
      return;
    }
    setForm(body.profile);
    setSavedHandle(body.profile.handle);
    setMessage({ ok: true, text: "Saved" });
    router.refresh();
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-4 rounded-xl border p-4" style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name shown on your reviews">
          <input value={form.displayName} onChange={(e) => set("displayName", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Profile handle">
          <div className="flex items-center rounded-lg border border-[var(--ks-border-strong)] pl-3 text-sm text-[var(--ks-text-faint)]">
            /u/
            <input
              value={form.handle}
              onChange={(e) => set("handle", e.target.value.toLowerCase())}
              className="min-w-0 flex-1 bg-transparent py-2 pr-3 text-[var(--ks-text)] focus:outline-none"
            />
          </div>
        </Field>
        <Field label="City (optional)">
          <input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Who can see your profile">
          <select
            value={form.profileVisibility}
            onChange={(e) => set("profileVisibility", e.target.value as ProfileUpdateInput["profileVisibility"])}
            className={inputCls}
          >
            <option value="PUBLIC">Everyone (your name links to your profile)</option>
            <option value="PRIVATE">Only me (reviews show just your initial)</option>
          </select>
        </Field>
      </div>
      <Field label={`Short bio (optional, ${280 - (form.bio?.length ?? 0)} characters left)`}>
        <textarea value={form.bio ?? ""} onChange={(e) => set("bio", e.target.value)} rows={3} maxLength={280} className={inputCls} />
      </Field>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
          style={{ background: brandGradient }}
        >
          {busy && <Loader2 size={14} className="animate-spin" />}
          Save profile
        </button>
        {form.profileVisibility === "PUBLIC" && (
          <Link href={`/u/${savedHandle}`} className="text-xs text-[var(--ks-text-muted)] hover:underline">
            View public profile
          </Link>
        )}
        {message && (
          <span className="text-xs" style={{ color: message.ok ? brand.success : brand.danger }}>
            {message.text}
          </span>
        )}
      </div>
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
