"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { brand, brandGradient } from "@/lib/brand";
import { CATEGORY_LABELS, CATEGORY_ORDER, type PropertyCategory } from "@/lib/constants";

export function SearchHero() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<PropertyCategory | "">("");

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
        Real tenants. Verified proof. No surprises.
      </p>
      <h1 className="mx-auto mt-3 max-w-2xl text-3xl font-bold sm:text-4xl" style={{ color: brand.white }}>
        Know the truth about a place before you pay a deposit
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-sm" style={{ color: "var(--ks-text-muted)" }}>
        Search apartments, PGs, hostels, and hotels rated by real tenants across rent fairness, safety,
        water, power backup, and more — every review backed by proof, not hearsay.
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
            placeholder="Property name, locality, district, or PIN code"
            className="w-full bg-transparent text-sm text-[var(--ks-text)] placeholder:text-[var(--ks-text-faint)] focus:outline-none"
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as PropertyCategory | "")}
          className="rounded-xl px-3 py-2.5 text-sm text-[var(--ks-text)]"
          style={{ background: "var(--ks-bg-input)" }}
        >
          <option value="" className="bg-[var(--ks-bg-elevated)]">All types</option>
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c} className="bg-[var(--ks-bg-elevated)]">
              {CATEGORY_LABELS[c]}
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
