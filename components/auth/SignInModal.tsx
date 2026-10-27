"use client";

import { useState } from "react";
import { X, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { brand, brandGradient } from "@/lib/brand";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignedIn: () => void;
  reason?: string;
  /** Passed through to the Google OAuth redirect's callbackUrl, so the page
   * that reopens after sign-in can resume an in-progress action (e.g.
   * WriteReviewGate re-opening the review modal). Ignored by the OTP tabs,
   * which are still a same-page mock. */
  googleCallbackUrl?: string;
}

type Tab = "GOOGLE" | "PHONE" | "EMAIL";
type OtpStep = "ENTER_DESTINATION" | "ENTER_CODE";

export function SignInModal({ isOpen, onClose, onSignedIn, reason, googleCallbackUrl }: SignInModalProps) {
  const { signInWithGoogle, signInWithOtp } = useAuth();
  const [tab, setTab] = useState<Tab>("GOOGLE");
  const [step, setStep] = useState<OtpStep>("ENTER_DESTINATION");
  const [destination, setDestination] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const reset = () => {
    setTab("GOOGLE");
    setStep("ENTER_DESTINATION");
    setDestination("");
    setCode("");
    setBusy(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleGoogle = () => {
    setBusy(true);
    // FR-AUTH-1: real Google OAuth 2.0 redirect (NextAuth). The browser
    // navigates away to Google and back, so there's no in-page "signed in"
    // callback to fire — the page reload after redirect picks up the
    // session, and Header re-renders signed-in on its own.
    signInWithGoogle(googleCallbackUrl);
  };

  const handleRequestOtp = () => {
    if (!destination.trim()) return;
    setBusy(true);
    // FR-AUTH-2: real flow calls POST /api/auth/otp/request (SMS/email gateway).
    setTimeout(() => {
      setBusy(false);
      setStep("ENTER_CODE");
    }, 400);
  };

  const handleVerifyOtp = () => {
    if (code.trim().length !== 6) return;
    setBusy(true);
    // FR-AUTH-2: real flow calls POST /api/auth/otp/verify against the sent code.
    setTimeout(() => {
      signInWithOtp(destination.trim(), tab === "PHONE" ? "SMS" : "EMAIL");
      setBusy(false);
      reset();
      onSignedIn();
    }, 400);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-modal-title"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

      <div
        className="relative w-full max-w-sm rounded-2xl border p-6"
        style={{ background: brand.navy, borderColor: "var(--ks-border)" }}
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-[var(--ks-text-muted)] transition-colors hover:bg-white/10"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <h2 id="signin-modal-title" className="text-lg font-bold" style={{ color: brand.white }}>
          Sign in to continue
        </h2>
        <p className="mt-1 text-xs" style={{ color: "var(--ks-text-muted)" }}>
          {reason ?? "You need a verified account to do this."}
        </p>

        <div className="mt-4 flex gap-1 rounded-full border p-1" style={{ borderColor: "var(--ks-border)" }}>
          {(["GOOGLE", "PHONE", "EMAIL"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setStep("ENTER_DESTINATION");
                setCode("");
              }}
              className="flex-1 rounded-full py-1.5 text-xs font-semibold transition-colors"
              style={tab === t ? { background: brandGradient, color: "#1a1024" } : { color: "var(--ks-text-muted)" }}
            >
              {t === "GOOGLE" ? "Google" : t === "PHONE" ? "Phone OTP" : "Email OTP"}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {tab === "GOOGLE" && (
            <button
              type="button"
              onClick={handleGoogle}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold text-[var(--ks-text)] transition-colors hover:bg-white/5 disabled:opacity-50"
              style={{ borderColor: "var(--ks-border-strong)" }}
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <GoogleMark />}
              Continue with Google
            </button>
          )}

          {(tab === "PHONE" || tab === "EMAIL") && step === "ENTER_DESTINATION" && (
            <div className="flex flex-col gap-3">
              <label className="text-xs font-medium text-[var(--ks-text-muted)]">
                {tab === "PHONE" ? "Phone number" : "Email address"}
              </label>
              <input
                type={tab === "PHONE" ? "tel" : "email"}
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={tab === "PHONE" ? "+91 98765 43210" : "you@example.com"}
                className="rounded-lg border bg-transparent px-3 py-2 text-sm text-[var(--ks-text)] placeholder:text-[var(--ks-text-faint)] focus:outline-none"
                style={{ borderColor: "var(--ks-border-strong)" }}
              />
              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={busy || !destination.trim()}
                className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-slate-950 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: brandGradient }}
              >
                {busy && <Loader2 size={16} className="animate-spin" />}
                Send OTP
              </button>
            </div>
          )}

          {(tab === "PHONE" || tab === "EMAIL") && step === "ENTER_CODE" && (
            <div className="flex flex-col gap-3">
              <label className="text-xs font-medium text-[var(--ks-text-muted)]">
                Enter the 6-digit code sent to {destination}
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="rounded-lg border bg-transparent px-3 py-2 text-center text-lg tracking-[0.5em] text-[var(--ks-text)] placeholder:tracking-normal placeholder:text-[var(--ks-text-faint)] focus:outline-none"
                style={{ borderColor: "var(--ks-border-strong)" }}
              />
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={busy || code.length !== 6}
                className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-slate-950 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: brandGradient }}
              >
                {busy && <Loader2 size={16} className="animate-spin" />}
                Verify &amp; continue
              </button>
              <p className="text-[11px]" style={{ color: "var(--ks-text-faint)" }}>
                (This is a local mock — any 6 digits will work.)
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center gap-1.5 text-[11px]" style={{ color: "var(--ks-text-faint)" }}>
          <ShieldCheck size={12} style={{ color: brand.success }} />
          We only use this to verify you're a real tenant, not to spam you.
        </div>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path
        d="M23.49 12.27c0-.8-.07-1.57-.2-2.31H12v4.51h6.47a5.6 5.6 0 0 1-2.4 3.63v3h3.86c2.26-2.09 3.56-5.17 3.56-8.83Z"
        fill="#4285F4"
      />
      <path
        d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.86-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z"
        fill="#34A853"
      />
      <path d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09Z" fill="#FBBC05" />
      <path
        d="M12 4.75c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.94 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
        fill="#EA4335"
      />
    </svg>
  );
}
