"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BadgeCheck,
  Building2,
  ChevronsLeft,
  ChevronsRight,
  Download,
  ExternalLink,
  Flag,
  FolderTree,
  History,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Megaphone,
  Menu,
  MessageSquareText,
  Reply,
  Search,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Bell } from "@/components/notifications/Bell";
import { brand, brandGradient } from "@/lib/brand";

export interface AdminCounts {
  reviews: number;
  reports: number;
  replies: number;
  claims: number;
  banners: number;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  count?: keyof AdminCounts;
  /** Badge colour: "alert" for queues that need work, "info" for plain totals. */
  tone?: "alert" | "info";
  superOnly?: boolean;
}

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/activity", label: "Activity log", icon: History, superOnly: true },
    ],
  },
  {
    group: "Moderation",
    items: [
      { href: "/admin/reviews", label: "Reviews", icon: MessageSquareText, count: "reviews", tone: "alert" },
      { href: "/admin/reports", label: "Reports", icon: Flag, count: "reports", tone: "alert" },
      { href: "/admin/replies", label: "Owner replies", icon: Reply, count: "replies", tone: "alert" },
      { href: "/admin/claims", label: "Claims", icon: BadgeCheck, count: "claims", tone: "alert" },
    ],
  },
  {
    group: "Content",
    items: [
      { href: "/admin/properties", label: "Businesses", icon: Building2 },
      { href: "/admin/categories", label: "Categories", icon: FolderTree, superOnly: true },
      { href: "/admin/question-sets", label: "Question sets", icon: ListChecks, superOnly: true },
      { href: "/admin/imports", label: "Imports", icon: Download, superOnly: true },
    ],
  },
  { group: "Growth", items: [{ href: "/admin/banners", label: "Banners", icon: Megaphone, count: "banners", tone: "info", superOnly: true }] },
  { group: "Settings", items: [{ href: "/admin/team", label: "Team and roles", icon: Users, superOnly: true }] },
];

const ROLE_LABEL: Record<string, string> = { SUPER_ADMIN: "Super admin", MODERATOR: "Moderator" };

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({
  counts,
  user,
  children,
}: {
  counts: AdminCounts;
  user: { name: string; email: string; role: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/admin";
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const superAdmin = user.role === "SUPER_ADMIN";

  useEffect(() => setCollapsed(localStorage.getItem("ks_admin_sidebar") === "collapsed"), []);
  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => menuRef.current && !menuRef.current.contains(e.target as Node) && setMenu(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("ks_admin_sidebar", next ? "collapsed" : "open");
  };

  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => superAdmin || !i.superOnly) })).filter((g) => g.items.length);
  const current = groups.flatMap((g) => g.items).filter((i) => isActive(pathname, i.href)).sort((a, b) => b.href.length - a.href.length)[0];

  const sidebar = (mini: boolean) => (
    <nav className="flex h-full flex-col gap-4 overflow-y-auto px-3 py-4" aria-label="Admin">
      <Link href="/admin" className={`flex items-center gap-2 px-2 text-sm font-bold tracking-tight ${mini ? "justify-center" : ""}`}>
        {mini ? (
          <span style={{ background: brandGradient, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>KS</span>
        ) : (
          <>
            <span>
              <span style={{ color: brand.white }}>Kiraaya</span>
              <span style={{ background: brandGradient, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Sense</span>
            </span>
            <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: "var(--ks-bg-input)", color: "var(--ks-text-muted)" }}>
              Admin
            </span>
          </>
        )}
      </Link>
      {groups.map((g) => (
        <div key={g.group}>
          {!mini && <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--ks-text-faint)]">{g.group}</p>}
          <ul className="flex flex-col gap-0.5">
            {g.items.map((item) => {
              const active = current?.href === item.href;
              const n = item.count ? counts[item.count] : 0;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={mini ? `${item.label}${n ? ` (${n})` : ""}` : undefined}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors ${mini ? "justify-center" : ""} ${
                      active ? "font-semibold text-[var(--ks-text)]" : "text-[var(--ks-text-muted)] hover:bg-white/5 hover:text-[var(--ks-text)]"
                    }`}
                    style={active ? { background: "var(--ks-bg-input)" } : undefined}
                  >
                    {active && <span className="absolute inset-y-1 start-0 w-0.5 rounded-full" style={{ background: "var(--ks-coral)" }} />}
                    <Icon size={17} className="shrink-0" style={active ? { color: "var(--ks-coral)" } : undefined} />
                    {!mini && <span className="flex-1 truncate">{item.label}</span>}
                    {n > 0 && (
                      <span
                        className={`rounded-full text-[10px] font-bold ${mini ? "absolute end-0.5 top-0.5 h-2 w-2 p-0" : "px-1.5 py-0.5"}`}
                        style={
                          item.tone === "alert"
                            ? { background: "var(--ks-coral)", color: "#fff" }
                            : { background: "var(--ks-bg-input)", color: "var(--ks-text-muted)" }
                        }
                      >
                        {mini ? "" : n > 999 ? "999+" : n}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen" style={{ background: brand.navy }}>
      {/* Desktop sidebar */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-e transition-[width] md:flex ${collapsed ? "w-16" : "w-60"}`}
        style={{ borderColor: "var(--ks-border-soft)", background: "var(--ks-bg-elevated)" }}
      >
        <div className="min-h-0 flex-1">{sidebar(collapsed)}</div>
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex items-center gap-2 border-t px-5 py-3 text-xs text-[var(--ks-text-muted)] hover:text-[var(--ks-text)]"
          style={{ borderColor: "var(--ks-border-soft)" }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} /> Collapse</>}
        </button>
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 start-0 w-64 shadow-xl" style={{ background: "var(--ks-bg-elevated)" }}>
            <button type="button" onClick={() => setDrawer(false)} className="absolute end-3 top-3 text-[var(--ks-text-muted)]" aria-label="Close menu">
              <X size={18} />
            </button>
            {sidebar(false)}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-40 flex items-center gap-3 border-b px-4 py-2.5 sm:px-6"
          style={{ borderColor: "var(--ks-border-soft)", background: brand.navy }}
        >
          <button type="button" onClick={() => setDrawer(true)} className="text-[var(--ks-text-muted)] md:hidden" aria-label="Open menu">
            <Menu size={20} />
          </button>
          <p className="truncate text-sm font-semibold text-[var(--ks-text)]">{current?.label ?? "Admin"}</p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) router.push(`/admin/search?q=${encodeURIComponent(q.trim())}`);
            }}
            className="ms-auto hidden max-w-sm flex-1 items-center gap-2 rounded-lg border px-3 py-1.5 sm:flex"
            style={{ borderColor: "var(--ks-border-strong)" }}
          >
            <Search size={14} className="text-[var(--ks-text-muted)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search businesses and people…"
              className="w-full bg-transparent text-sm text-[var(--ks-text)] placeholder:text-[var(--ks-text-faint)] focus:outline-none"
            />
          </form>

          <div className="ms-auto flex items-center gap-2 sm:ms-0">
            <Link
              href="/"
              target="_blank"
              className="hidden items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-[var(--ks-text-muted)] hover:text-[var(--ks-text)] lg:flex"
            >
              View site <ExternalLink size={12} />
            </Link>
            <Bell settingsHref="/profile#alerts" />
            <ThemeToggle />
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenu(!menu)}
                aria-expanded={menu}
                aria-label="Account"
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-slate-950"
                style={{ background: brandGradient }}
              >
                {(user.name || user.email).slice(0, 1).toUpperCase()}
              </button>
              {menu && (
                <div
                  className="absolute end-0 top-10 z-50 w-64 overflow-hidden rounded-xl border shadow-xl"
                  style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}
                >
                  <div className="border-b px-4 py-3" style={{ borderColor: "var(--ks-border)" }}>
                    <p className="truncate text-sm font-semibold text-[var(--ks-text)]">{user.name}</p>
                    <p className="truncate text-xs text-[var(--ks-text-muted)]">{user.email}</p>
                    <p className="mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase" style={{ background: "var(--ks-bg-input)", color: "var(--ks-text-muted)" }}>
                      {ROLE_LABEL[user.role] ?? user.role}
                    </p>
                  </div>
                  <Link href="/profile#alerts" className="block px-4 py-2 text-sm text-[var(--ks-text-muted)] hover:bg-white/5 hover:text-[var(--ks-text)]">
                    My alert settings
                  </Link>
                  <Link href="/" className="block px-4 py-2 text-sm text-[var(--ks-text-muted)] hover:bg-white/5 hover:text-[var(--ks-text)]">
                    Back to site
                  </Link>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex w-full items-center gap-2 border-t px-4 py-2.5 text-start text-sm font-semibold text-[var(--ks-text)] hover:bg-white/5"
                    style={{ borderColor: "var(--ks-border)" }}
                  >
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
