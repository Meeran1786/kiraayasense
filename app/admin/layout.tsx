import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { brand, brandGradient } from "@/lib/brand";
import { SignOutButton } from "./SignOutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // middleware.ts already blocks non-admins from reaching this layout at
  // all; this session read is just to greet the signed-in admin by name.
  const session = await getServerSession(authOptions);

  return (
    <div style={{ background: brand.navy, minHeight: "100vh" }}>
      <header className="border-b" style={{ borderColor: "var(--ks-border-soft)" }}>
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3 sm:px-6">
          <Link href="/admin" className="text-sm font-bold tracking-tight">
            <span style={{ color: brand.white }}>Kiraaya</span>
            <span
              style={{ background: brandGradient, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
            >
              Sense
            </span>
            <span className="ml-1.5 text-xs font-normal" style={{ color: "var(--ks-text-faint)" }}>
              Admin
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-xs font-medium" style={{ color: "var(--ks-text-muted)" }}>
            <Link href="/admin" className="hover:text-[var(--ks-text)]">Dashboard</Link>
            <Link href="/admin/banners" className="hover:text-[var(--ks-text)]">Banners</Link>
            <Link href="/admin/properties" className="hover:text-[var(--ks-text)]">Properties</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-xs" style={{ color: "var(--ks-text-muted)" }}>
            <Link href="/" className="hover:text-[var(--ks-text)]">← Back to site</Link>
            <span>{session?.user?.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
