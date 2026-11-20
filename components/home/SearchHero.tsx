"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LocateFixed, PlayCircle, Search } from "lucide-react";
import { brand, brandGradient } from "@/lib/brand";
import { useT } from "@/lib/i18n/client";

export function SearchHero({
  categories,
  top,
}: {
  categories: { slug: string; name: string }[];
  /** Shown above the headline, inside the hero background (the ad carousel). */
  top?: React.ReactNode;
}) {
  const router = useRouter();
  const t = useT();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Location is asked for only when someone taps "Places near me", never on page load.
  const nearMe = () => {
    if (!("geolocation" in navigator)) {
      setGeoError(t("filter.noGeo"));
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const params = new URLSearchParams({
          // About 100 m: enough to search, and the URL never carries an exact position.
          lat: pos.coords.latitude.toFixed(3),
          lng: pos.coords.longitude.toFixed(3),
          km: "5",
          sort: "nearest",
        });
        if (category) params.set("category", category);
        router.push(`/search?${params.toString()}`);
      },
      () => {
        setLocating(false);
        setGeoError(t("filter.geoDenied"));
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category) params.set("category", category);
    router.push(`/search${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <section
      className={`relative overflow-hidden px-4 pb-14 text-center sm:px-6 ${top ? "pt-4" : "pt-14"}`}
      style={{ background: `radial-gradient(120% 100% at 50% -20%, oklch(30% 0.06 25 / 0.35), transparent), ${brand.navy}` }}
    >
      {top}
      <p className={`text-xs font-semibold uppercase tracking-widest ${top ? "mt-8" : ""}`} style={{ color: "var(--ks-text-muted)" }}>
        {t("home.kicker")}
      </p>
      <h1 className="mx-auto mt-3 max-w-2xl text-3xl font-bold sm:text-4xl" style={{ color: brand.white }}>
        {t("home.title")}
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-sm" style={{ color: "var(--ks-text-muted)" }}>
        {t("home.subtitle")}
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
            placeholder={t("home.searchPlaceholder")}
            className="w-full bg-transparent text-sm text-[var(--ks-text)] placeholder:text-[var(--ks-text-faint)] focus:outline-none"
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl px-3 py-2.5 text-sm text-[var(--ks-text)]"
          style={{ background: "var(--ks-bg-input)" }}
        >
          <option value="" className="bg-[var(--ks-bg-elevated)]">{t("home.allCategories")}</option>
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
          {t("home.search")}
        </button>
      </form>
      <div className="mt-3 flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={nearMe}
          disabled={locating}
          className="inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold text-[var(--ks-text)] hover:opacity-90 disabled:opacity-60"
          style={{ borderColor: "var(--ks-border-strong)", background: "var(--ks-bg-elevated)" }}
        >
          {locating ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} style={{ color: "var(--ks-coral)" }} />}
          {locating ? t("home.locating") : t("home.nearMe")}
        </button>
        {geoError && <p className="text-xs" style={{ color: "var(--ks-text-muted)" }}>{geoError}</p>}
      </div>
      <Link
        href="/tutorials"
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ks-text-muted)] hover:text-[var(--ks-text)]"
      >
        <PlayCircle size={15} style={{ color: "var(--ks-coral)" }} />
        {t("home.watchTutorial")}
      </Link>
    </section>
  );
}
