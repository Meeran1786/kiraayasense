"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, UserCircle2, LogOut } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { SignInModal } from "@/components/auth/SignInModal";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { brand, brandGradient } from "@/lib/brand";

export function Header({ navCategories }: { navCategories: { slug: string; name: string }[] }) {
  const { user, signOut } = useAuth();
  const [signInOpen, setSignInOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : "/search");
  };

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b"
        style={{ background: brand.navy, borderColor: "var(--ks-border-soft)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 sm:px-6">
          <Link href="/" className="shrink-0 text-lg font-bold tracking-tight">
            <span style={{ color: brand.white }}>Kiraaya</span>
            <span
              style={{
                background: brandGradient,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Sense
            </span>
          </Link>

          <form onSubmit={handleSearch} className="hidden flex-1 items-center gap-2 md:flex">
            <div
              className="flex flex-1 items-center gap-2 rounded-full border px-3 py-1.5"
              style={{ borderColor: "var(--ks-border-strong)" }}
            >
              <Search size={15} className="text-[var(--ks-text-muted)]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search businesses, categories, localities or PIN"
                className="w-full bg-transparent text-sm text-[var(--ks-text)] placeholder:text-[var(--ks-text-faint)] focus:outline-none"
              />
            </div>
          </form>

          <nav className="hidden items-center gap-4 lg:flex">
            {navCategories.slice(0, 4).map((c) => (
              <Link
                key={c.slug}
                href={`/search?category=${c.slug}`}
                className="whitespace-nowrap text-xs font-medium text-[var(--ks-text-muted)] transition-colors hover:text-[var(--ks-text)]"
              >
                {c.name}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <ThemeToggle />
            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden text-xs text-[var(--ks-text-muted)] sm:inline">Hi, {user.displayName}</span>
                <button
                  type="button"
                  onClick={signOut}
                  className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold text-[var(--ks-text)] transition-colors hover:bg-white/5"
                  style={{ borderColor: "var(--ks-border-strong)" }}
                >
                  <LogOut size={13} />
                  Sign out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSignInOpen(true)}
                className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold text-slate-950"
                style={{ background: brandGradient }}
              >
                <UserCircle2 size={14} />
                Sign in
              </button>
            )}
          </div>
        </div>

        {/* Mobile search row */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 border-t px-4 py-2 md:hidden" style={{ borderColor: "var(--ks-border-soft)" }}>
          <div className="flex flex-1 items-center gap-2 rounded-full border px-3 py-1.5" style={{ borderColor: "var(--ks-border-strong)" }}>
            <Search size={15} className="text-[var(--ks-text-muted)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search businesses, locality, PIN"
              className="w-full bg-transparent text-sm text-[var(--ks-text)] placeholder:text-[var(--ks-text-faint)] focus:outline-none"
            />
          </div>
        </form>
      </header>

      <SignInModal isOpen={signInOpen} onClose={() => setSignInOpen(false)} onSignedIn={() => setSignInOpen(false)} />
    </>
  );
}
