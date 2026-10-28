import { Footer } from "@/components/layout/Footer";
import { brand } from "@/lib/brand";
import { LEGAL_UPDATED } from "@/lib/legal";

/** Shared shell for /privacy and /terms. */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main style={{ background: brand.navy, minHeight: "100vh" }}>
      <article className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8 text-sm leading-relaxed text-[var(--ks-text-muted)] sm:px-6 [&_a]:underline [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-[var(--ks-text)] [&_li]:ml-5 [&_li]:list-disc">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ks-text)]">{title}</h1>
          <p className="mt-1 text-xs text-[var(--ks-text-faint)]">Last updated {LEGAL_UPDATED}</p>
        </div>
        {children}
      </article>
      <Footer />
    </main>
  );
}
