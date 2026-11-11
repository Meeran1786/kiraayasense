"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, UserCircle2, LogOut, Store } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { SignInModal } from "@/components/auth/SignInModal";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { useT } from "@/lib/i18n/client";
import { brand, brandGradient } from "@/lib/brand";

export function Header({ navCategories }: { navCategories: { slug: string; name: string }[] }) {
  const { user, signOut } = useAuth();
  const [signInOpen, setSignInOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();
  // The home page has its own big search box, so the header one would repeat it.
  const showSearch = usePathname() !== "/";
  const t = useT();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : "/search");
  };

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b print:hidden"
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

          <form onSubmit={handleSearch} className={`hidden flex-1 items-center gap-2 ${showSearch ? "md:flex" : ""}`}>
            <div
              className="flex flex-1 items-center gap-2 rounded-full border px-3 py-1.5"
              style={{ borderColor: "var(--ks-border-strong)" }}
            >
              <Search size={15} className="text-[var(--ks-text-muted)]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("nav.search")}
                className="w-full bg-transparent text-sm text-[var(--ks-text)] placeholder:text-[var(--ks-text-faint)] focus:outline-none"
              />
            </div>
          </form>

          <nav className="hidden items-center gap-4 lg:flex">
            {navCategories.slice(0, 3).map((c) => (
              <Link
                key={c.slug}
                href={`/search?category=${c.slug}`}
                className="whitespace-nowrap text-xs font-medium text-[var(--ks-text-muted)] transition-colors hover:text-[var(--ks-text)]"
              >
                {c.name}
              </Link>
            ))}
          </nav>

          <div className="ms-auto flex shrink-0 items-center gap-2 sm:gap-3">
            {/* Shown to everyone, signed in or not: the way in for owners to claim and manage a listing. */}
            <Link
              href="/for-businesses"
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-white/5 sm:px-3"
              style={{ borderColor: "var(--ks-coral)", color: "var(--ks-text)" }}
            >
              <Store size={14} style={{ color: "var(--ks-coral)" }} />
              <span className="sm:hidden">{t("nav.forBusinessesShort")}</span>
              <span className="hidden sm:inline">{t("nav.forBusinesses")}</span>
            </Link>
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            <ThemeToggle />
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-1 text-xs text-[var(--ks-text-muted)] hover:text-[var(--ks-text)]"
                  aria-label={t("nav.profile")}
                >
                  <UserCircle2 size={16} />
                  <span className="hidden sm:inline">{user.displayName}</span>
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold text-[var(--ks-text)] transition-colors hover:bg-white/5"
                  style={{ borderColor: "var(--ks-border-strong)" }}
                >
                  <LogOut size={13} />
                  {t("nav.signOut")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSignInOpen(true)}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold text-slate-950 sm:px-4"
                style={{ background: brandGradient }}
              >
                <UserCircle2 size={14} />
                {t("nav.signIn")}
              </button>
            )}
          </div>
        </div>

        {/* Mobile search row. On the home page only the phone language picker remains. */}
        <form
          onSubmit={handleSearch}
          className={`flex items-center gap-2 border-t px-4 py-2 ${showSearch ? "md:hidden" : "justify-end sm:hidden"}`}
          style={{ borderColor: "var(--ks-border-soft)" }}
        >
          <div
            className={`flex-1 items-center gap-2 rounded-full border px-3 py-1.5 ${showSearch ? "flex" : "hidden"}`}
            style={{ borderColor: "var(--ks-border-strong)" }}
          >
            <Search size={15} className="text-[var(--ks-text-muted)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("nav.searchShort")}
              className="w-full bg-transparent text-sm text-[var(--ks-text)] placeholder:text-[var(--ks-text-faint)] focus:outline-none"
            />
          </div>
          {/* On phones the language picker sits here; the top row has no room for it. */}
          <div className="sm:hidden">
            <LanguageSwitcher />
          </div>
        </form>
      </header>

      <SignInModal isOpen={signInOpen} onClose={() => setSignInOpen(false)} onSignedIn={() => setSignInOpen(false)} />
    </>
  );
}
