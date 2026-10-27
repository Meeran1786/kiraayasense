"use client";

import { signIn } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { brand, brandGradient } from "@/lib/brand";

export function AdminLoginClient({ signedInEmail, isAdmin }: { signedInEmail: string | null; isAdmin: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (isAdmin) router.replace("/admin");
  }, [isAdmin, router]);

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-4 text-center"
      style={{ background: brand.navy }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-6"
        style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}
      >
        <h1 className="text-lg font-bold" style={{ color: brand.white }}>
          KiraayaSense Admin
        </h1>

        {signedInEmail && !isAdmin ? (
          <div className="mt-4 flex flex-col items-center gap-2">
            <ShieldAlert size={28} style={{ color: brand.warn }} />
            <p className="text-sm" style={{ color: "var(--ks-text-muted)" }}>
              You're signed in as <strong>{signedInEmail}</strong>, but this account doesn't have admin access.
            </p>
            <p className="text-xs" style={{ color: "var(--ks-text-faint)" }}>
              Ask whoever manages the database to run{" "}
              <code className="rounded bg-black/30 px-1 py-0.5">npm run make-admin -- {signedInEmail}</code>.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-1 text-xs" style={{ color: "var(--ks-text-muted)" }}>
              Sign in with the Google account that's been granted MODERATOR or SUPER_ADMIN access.
            </p>
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/admin" })}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-slate-950"
              style={{ background: brandGradient }}
            >
              Continue with Google
            </button>
          </>
        )}
      </div>
    </main>
  );
}
