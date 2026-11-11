"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, MessageCircle, Check } from "lucide-react";
import { brand, brandGradient } from "@/lib/brand";
import { ALERT_TYPES, type AlertType, type ChannelPrefs } from "@/lib/notify/types";

type Props = {
  types: AlertType[];
  prefs: Record<string, ChannelPrefs>;
  email: string | null;
  phone: string | null; // masked, only when verified
  whatsappOn: boolean;
  whatsappReady: boolean; // the site has WhatsApp set up
};

const GROUPS: { audience: string; title: string }[] = [
  { audience: "admin", title: "Admin" },
  { audience: "owner", title: "Businesses you manage" },
  { audience: "user", title: "Your reviews and points" },
];

/** The "Alerts" card on /profile: per-alert email and WhatsApp switches, and WhatsApp number verification. */
export function AlertSettings(props: Props) {
  const router = useRouter();
  const [prefs, setPrefs] = useState(props.prefs);
  const [whatsappOn, setWhatsappOn] = useState(props.whatsappOn);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async (body: object) => {
    setMsg(null);
    const res = await fetch("/api/me/alerts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setMsg({ ok: false, text: data?.error?.message ?? "Could not save" });
      return false;
    }
    setMsg({ ok: true, text: "Saved" });
    return true;
  };

  const toggle = async (type: AlertType, channel: keyof ChannelPrefs) => {
    const next = { ...prefs[type], [channel]: !prefs[type][channel] };
    setPrefs((p) => ({ ...p, [type]: next }));
    if (!(await save({ prefs: { [type]: { [channel]: next[channel] } } }))) {
      setPrefs((p) => ({ ...p, [type]: { ...next, [channel]: !next[channel] } }));
    }
  };

  const setWhatsapp = async (on: boolean) => {
    if (await save({ whatsapp: on })) setWhatsappOn(on);
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4" style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}>
      <p className="text-xs text-[var(--ks-text-muted)]">
        Every alert also shows on the bell at the top of the site. Emails go to {props.email ?? "your Google address"}.
      </p>

      <WhatsAppNumber {...props} whatsappOn={whatsappOn} onToggle={setWhatsapp} onVerified={() => { setWhatsappOn(true); router.refresh(); }} />

      {GROUPS.map((g) => {
        const rows = props.types.filter((t) => ALERT_TYPES[t].audience === g.audience);
        if (!rows.length) return null;
        return (
          <div key={g.audience}>
            <div className="mb-1 grid grid-cols-[1fr_auto_auto] items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--ks-text-faint)]">
              <span>{g.title}</span>
              <span className="flex w-16 items-center justify-center gap-1"><Mail size={12} /> Email</span>
              <span className="flex w-16 items-center justify-center gap-1"><MessageCircle size={12} /> WhatsApp</span>
            </div>
            {rows.map((t) => (
              <div key={t} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-t py-2 text-sm" style={{ borderColor: "var(--ks-border-soft)" }}>
                <span className="text-[var(--ks-text)]">{ALERT_TYPES[t].label}</span>
                <Switch on={prefs[t].email} onClick={() => toggle(t, "email")} label={`Email: ${ALERT_TYPES[t].label}`} />
                <Switch
                  on={prefs[t].whatsapp && whatsappOn}
                  disabled={!whatsappOn}
                  onClick={() => toggle(t, "whatsapp")}
                  label={`WhatsApp: ${ALERT_TYPES[t].label}`}
                />
              </div>
            ))}
          </div>
        );
      })}

      {msg && <span className="text-xs" style={{ color: msg.ok ? brand.success : brand.danger }}>{msg.text}</span>}
    </div>
  );
}

function Switch({ on, onClick, disabled, label }: { on: boolean; onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <span className="flex w-16 justify-center">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        className="relative h-5 w-9 rounded-full transition-colors disabled:opacity-40"
        style={{ background: on ? "var(--ks-coral)" : "var(--ks-border-strong)" }}
      >
        <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all" style={{ left: on ? 18 : 2 }} />
      </button>
    </span>
  );
}

function WhatsAppNumber({
  phone,
  whatsappOn,
  whatsappReady,
  onToggle,
  onVerified,
}: Props & { onToggle: (on: boolean) => void; onVerified: () => void }) {
  const [editing, setEditing] = useState(!phone);
  const [number, setNumber] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const call = async (method: string, body: object) => {
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/me/phone", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) setErr(data?.error?.message ?? "Something went wrong");
    return res.ok ? data : null;
  };

  const box = "rounded-lg border p-3";
  if (!whatsappReady && !phone) {
    return (
      <div className={box} style={{ borderColor: "var(--ks-border-soft)" }}>
        <p className="flex items-center gap-2 text-sm text-[var(--ks-text)]"><MessageCircle size={15} /> WhatsApp alerts are coming soon.</p>
        <p className="mt-0.5 text-xs text-[var(--ks-text-muted)]">You&apos;ll be able to add your number here to get alerts on WhatsApp.</p>
      </div>
    );
  }

  if (phone && !editing) {
    return (
      <div className={`${box} flex flex-wrap items-center gap-3`} style={{ borderColor: "var(--ks-border-soft)" }}>
        <MessageCircle size={15} style={{ color: brand.success }} />
        <span className="text-sm text-[var(--ks-text)]">
          WhatsApp <b>{phone}</b> <Check size={13} className="inline" style={{ color: brand.success }} /> verified
        </span>
        <label className="ms-auto flex items-center gap-2 text-xs text-[var(--ks-text-muted)]">
          WhatsApp alerts
          <Switch on={whatsappOn} onClick={() => onToggle(!whatsappOn)} label="WhatsApp alerts" />
        </label>
        <button type="button" onClick={() => setEditing(true)} className="text-xs text-[var(--ks-text-muted)] hover:underline">
          Change number
        </button>
      </div>
    );
  }

  return (
    <div className={`${box} flex flex-col gap-2`} style={{ borderColor: "var(--ks-border-soft)" }}>
      <p className="flex items-center gap-2 text-sm font-medium text-[var(--ks-text)]"><MessageCircle size={15} /> Get alerts on WhatsApp</p>
      <p className="text-xs text-[var(--ks-text-muted)]">
        We&apos;ll send a 6-digit code to your WhatsApp. By verifying, you agree to receive the alerts you switch on below. Turn them off any time.
      </p>
      {!sentTo ? (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await call("POST", { phone: number });
            if (r) setSentTo(r.phone);
          }}
        >
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            inputMode="tel"
            placeholder="98765 43210"
            aria-label="WhatsApp number"
            className="min-w-0 flex-1 rounded-lg border border-[var(--ks-border-strong)] bg-transparent px-3 py-2 text-sm text-[var(--ks-text)] focus:outline-none"
          />
          <button type="submit" disabled={busy || !number.trim()} className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50" style={{ background: brandGradient }}>
            {busy && <Loader2 size={14} className="animate-spin" />} Send code
          </button>
          {phone && (
            <button type="button" onClick={() => setEditing(false)} className="text-xs text-[var(--ks-text-muted)] hover:underline">Cancel</button>
          )}
        </form>
      ) : (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await call("PUT", { phone: sentTo, code });
            if (r) onVerified();
          }}
        >
          <span className="text-xs text-[var(--ks-text-muted)]">Code sent to {sentTo}</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit code"
            aria-label="Verification code"
            className="w-32 rounded-lg border border-[var(--ks-border-strong)] bg-transparent px-3 py-2 text-sm tracking-widest text-[var(--ks-text)] focus:outline-none"
          />
          <button type="submit" disabled={busy || code.length !== 6} className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50" style={{ background: brandGradient }}>
            {busy && <Loader2 size={14} className="animate-spin" />} Verify
          </button>
          <button type="button" onClick={() => { setSentTo(null); setCode(""); }} className="text-xs text-[var(--ks-text-muted)] hover:underline">
            Use another number
          </button>
        </form>
      )}
      {err && <span className="text-xs" style={{ color: brand.danger }}>{err}</span>}
    </div>
  );
}
