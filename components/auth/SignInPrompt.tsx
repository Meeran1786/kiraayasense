"use client";

import { useState } from "react";
import { SignInModal } from "@/components/auth/SignInModal";
import { brandGradient } from "@/lib/brand";

export function SignInPrompt({
  text = "Sign in to see your profile and the reviews you have written.",
  callbackUrl = "/profile",
}: {
  text?: string;
  callbackUrl?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <p className="text-sm text-[var(--ks-text-muted)]">{text}</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl px-5 py-2 text-sm font-bold text-slate-950"
        style={{ background: brandGradient }}
      >
        Sign in
      </button>
      <SignInModal isOpen={open} onClose={() => setOpen(false)} onSignedIn={() => setOpen(false)} googleCallbackUrl={callbackUrl} />
    </div>
  );
}
