"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { brand, brandGradient } from "@/lib/brand";

export function SearchHero({ categories }: { categories: { slug: string; name: string }[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category) params.set("category", category);
    router.push(`/search${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <section
      className="relative overflow-hidden px-4 py-14 text-center sm:px-6"
      style={{ background: `radial-gradient(120% 100% at 50% -20%, oklch(30% 0.06 25 / 0.35), transparent), ${brand.navy}` }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ks-text-muted)" }}>
        Real customers, tenants and employees. Proof-backed reviews.
      </p>
      <h1 className="mx-auto mt-3 max-w-2xl text-3xl font-bold sm:text-4xl" style={{ color: brand.white }}>
        Know the truth about a business before you pay or join
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-sm" style={{ color: "var(--ks-text-muted)" }}>
        Homes and PGs, employers, hospitals, colleges, banks, service providers and more, rated on the
        questions that matter for each, by people who dealt with them.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mx-auto mt-7 flex max-w-2xl flex-col gap-2 rounded-2xl border p-2 sm:flex-row"
        style={{ borderColor: "var(--ks-border-strong)", background: "var(--ks-bg-elevated)" }}
      >
        <div className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--ks-bg-input)" }}>
          <Search size={16} className="shrink-0 text-[var(--ks-text-muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Business name, category, locality, or PIN code"
            className="w-full bg-transparent text-sm text-[var(--ks-text)] placeholder:text-[var(--ks-text-faint)] focus:outline-none"
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl px-3 py-2.5 text-sm text-[var(--ks-text)]"
          style={{ background: "var(--ks-bg-input)" }}
        >
          <option value="" className="bg-[var(--ks-bg-elevated)]">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug} className="bg-[var(--ks-bg-elevated)]">
              {c.name}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="rounded-xl px-6 py-2.5 text-sm font-bold text-slate-950"
          style={{ background: brandGradient }}
        >
          Search
        </button>
      </form>
    </section>
  );
}
