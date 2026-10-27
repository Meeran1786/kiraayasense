"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-full border px-3 py-1 hover:bg-white/5"
      style={{ borderColor: "var(--ks-border-strong)" }}
    >
      Sign out
    </button>
  );
}
