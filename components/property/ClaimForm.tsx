"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Paperclip } from "lucide-react";
import { brand, brandGradient } from "@/lib/brand";
import { CLAIMANT_ROLES, claimSchema } from "@/lib/claims";
import { uploadFile } from "@/lib/uploadClient";

export function ClaimForm({ propertyId, propertyName }: { propertyId: string; propertyName: string }) {
  const [role, setRole] = useState<(typeof CLAIMANT_ROLES)[number]>("Owner");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [proofKey, setProofKey] = useState<string | null>(null);
  const [proofName, setProofName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      setProofKey(await uploadFile(file, "VERIFICATION_PROOF"));
      setProofName(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = claimSchema.safeParse({
      claimantRole: role,
      contactPhone: phone,
      workEmail: email,
      proofStorageKey: proofKey,
      message: message.trim() || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/properties/${propertyId}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    const body = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(body?.error?.message ?? "Could not send your claim");
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="flex flex-col items-start gap-2 rounded-xl border p-5" style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}>
        <p className="flex items-center gap-2 font-semibold text-[var(--ks-text)]">
          <CheckCircle2 size={18} style={{ color: brand.success }} /> Claim sent
        </p>
        <p className="text-sm text-[var(--ks-text-muted)]">
          Our team will call you on the number you gave, usually within 3 working days. Once verified, you can correct
          the listing and reply to reviews.
        </p>
        <Link href={`/property/${propertyId}`} className="text-sm text-[var(--ks-text-muted)] underline">
          Back to {propertyName}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-xl border p-5" style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}>
      <Field label="Your role at this business">
        <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className={inputCls}>
          {CLAIMANT_ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Mobile number (we call to verify, never shown)">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="98xxxxxxxx" className={inputCls} />
        </Field>
        <Field label="Work email (optional)">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@yourbusiness.in" className={inputCls} />
        </Field>
      </div>
      <Field label="Proof you run this business (optional, speeds things up)">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[var(--ks-border-strong)] px-3 py-2 text-sm text-[var(--ks-text-muted)]">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
          {proofName ?? "GST certificate, trade licence, shop establishment certificate or a utility bill (JPG, PNG or PDF)"}
          <input type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <span className="text-[11px] text-[var(--ks-text-faint)]">Seen only by our verification team. Never published.</span>
      </Field>
      <Field label="Anything to correct on the listing? (optional)">
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={1000} className={inputCls} />
      </Field>
      {error && <p className="text-xs" style={{ color: brand.danger }}>{error}</p>}
      <button
        type="submit"
        disabled={busy || uploading}
        className="flex items-center justify-center gap-2 self-start rounded-xl px-5 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50"
        style={{ background: brandGradient }}
      >
        {busy && <Loader2 size={14} className="animate-spin" />}
        Send claim
      </button>
      <p className="text-[11px] text-[var(--ks-text-faint)]">
        Claiming a listing lets you correct its details and reply to reviews. It never lets you remove or edit reviews.
      </p>
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
