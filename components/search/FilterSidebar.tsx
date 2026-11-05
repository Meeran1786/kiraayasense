"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Loader2, LocateFixed, SlidersHorizontal, X } from "lucide-react";
import type { CategoryNode } from "@/lib/db/categories";
import type { LocationOptions } from "@/lib/db/locations";
import { useT } from "@/lib/i18n/client";
import { categoryName } from "@/lib/i18n/translate";

const RADII = [2, 5, 10, 25];
const FILTER_KEYS = ["category", "minRating", "state", "city", "locality", "lat", "lng", "km", "verified", "reviewed"];

export function FilterSidebar({ categories, locations }: { categories: CategoryNode[]; locations: LocationOptions }) {
  const router = useRouter();
  const t = useT();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const category = searchParams.get("category");
  const minRating = searchParams.get("minRating");
  const state = searchParams.get("state") ?? "";
  const city = searchParams.get("city") ?? "";
  const locality = searchParams.get("locality") ?? "";
  const near = searchParams.get("lat") && searchParams.get("lng");
  const km = searchParams.get("km") ?? "5";
  const verified = searchParams.get("verified") === "1";
  const reviewed = searchParams.get("reviewed") === "1";
  const sort = searchParams.get("sort") ?? (near ? "nearest" : "rating_desc");

  const activeCount = FILTER_KEYS.filter((k) => searchParams.get(k) && !["lng", "km"].includes(k)).length;

  // The selected category's top-level parent, so its sub-categories stay
  // listed whether the parent or one of its children is selected.
  const openTop = categories.find((c) => c.slug === category || c.children.some((s) => s.slug === category));

  const update = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocateError(t("filter.noGeo"));
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        // Three decimals is about 100 m: enough to search, and the URL never
        // carries an exact position.
        update({
          lat: pos.coords.latitude.toFixed(3),
          lng: pos.coords.longitude.toFixed(3),
          km: km,
          sort: "nearest",
          state: null,
          city: null,
          locality: null,
        });
      },
      () => {
        setLocating(false);
        setLocateError(t("filter.geoDenied"));
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  };

  const clearAll = () => {
    const params = new URLSearchParams(searchParams.toString());
    FILTER_KEYS.forEach((k) => params.delete(k));
    if (params.get("sort") === "nearest") params.delete("sort");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <aside className="w-full shrink-0 sm:w-60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium text-[var(--ks-text)] sm:hidden"
        style={{ borderColor: "var(--ks-border-strong)" }}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal size={14} /> {t("filter.filters")}{activeCount ? ` (${activeCount})` : ""}
        </span>
        <span className="text-xs text-[var(--ks-text-faint)]">{open ? t("filter.hide") : t("filter.show")}</span>
      </button>

      <div className={`${open ? "flex" : "hidden"} mt-4 flex-col gap-6 sm:mt-0 sm:flex`}>
        {activeCount > 0 && (
          <button type="button" onClick={clearAll} className="flex items-center gap-1 self-start text-xs font-medium text-[var(--ks-coral)] hover:underline">
            <X size={12} /> {t("filter.clear")}
          </button>
        )}

        <Section title={t("filter.location")}>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition disabled:opacity-60"
              style={
                near
                  ? { borderColor: "var(--ks-success)", color: "var(--ks-success)" }
                  : { borderColor: "var(--ks-border-strong)", color: "var(--ks-text)" }
              }
            >
              {locating ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} />}
              {near ? t("filter.nearMeOn") : t("filter.nearMe")}
            </button>
            {locateError && <p className="text-[11px] text-[var(--ks-danger)]">{locateError}</p>}
            {near && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-[var(--ks-text-faint)]">{t("filter.within")}</span>
                {RADII.map((r) => (
                  <Chip key={r} label={`${r} km`} active={km === String(r)} onClick={() => update({ km: String(r) })} />
                ))}
                <button
                  type="button"
                  onClick={() => update({ lat: null, lng: null, km: null, sort: sort === "nearest" ? null : sort })}
                  className="text-[11px] text-[var(--ks-text-faint)] underline"
                >
                  Turn off
                </button>
              </div>
            )}

            {!near && (
              <>
                <Select
                  label={t("filter.state")}
                  value={state}
                  placeholder={t("filter.allStates")}
                  options={locations.states}
                  onChange={(v) => update({ state: v, city: null, locality: null })}
                />
                {state && (
                  <Select
                    label={t("filter.city")}
                    value={city}
                    placeholder={t("filter.allCities")}
                    options={locations.cities}
                    onChange={(v) => update({ city: v, locality: null })}
                  />
                )}
                {state && city && locations.localities.length > 0 && (
                  <Select
                    label={t("filter.locality")}
                    value={locality}
                    placeholder={t("filter.allLocalities")}
                    options={locations.localities}
                    onChange={(v) => update({ locality: v })}
                  />
                )}
              </>
            )}
          </div>
        </Section>

        <Section title={t("filter.sortBy")}>
          <select
            value={sort}
            onChange={(e) => update({ sort: e.target.value })}
            className="w-full rounded-lg border bg-transparent px-2.5 py-2 text-sm text-[var(--ks-text)]"
            style={{ borderColor: "var(--ks-border-strong)" }}
          >
            {near && <option value="nearest" className="bg-[var(--ks-bg-elevated)]">{t("filter.nearest")}</option>}
            <option value="rating_desc" className="bg-[var(--ks-bg-elevated)]">{t("filter.highestRated")}</option>
            <option value="review_count_desc" className="bg-[var(--ks-bg-elevated)]">{t("filter.mostReviewed")}</option>
            <option value="newest" className="bg-[var(--ks-bg-elevated)]">{t("filter.newest")}</option>
          </select>
        </Section>

        <Section title={t("filter.reviews")}>
          <div className="flex flex-col gap-2">
            <Toggle label={t("filter.hasReviews")} checked={reviewed} onChange={(on) => update({ reviewed: on ? "1" : null })} />
            <Toggle label={t("filter.verifiedOnly")} hint={t("filter.verifiedHint")} checked={verified} onChange={(on) => update({ verified: on ? "1" : null })} />
          </div>
        </Section>

        <Section title={t("filter.category")}>
          <div className="flex flex-col gap-1.5">
            <FilterOption label={t("home.allCategories")} active={!category} onClick={() => update({ category: null })} />
            {categories.map((c) => (
              <div key={c.slug} className="flex flex-col gap-1">
                <FilterOption label={categoryName(t, c.slug, c.name)} active={category === c.slug} onClick={() => update({ category: c.slug })} />
                {openTop?.slug === c.slug &&
                  c.children.map((s) => (
                    <FilterOption key={s.slug} label={categoryName(t, s.slug, s.name)} indent active={category === s.slug} onClick={() => update({ category: s.slug })} />
                  ))}
              </div>
            ))}
          </div>
        </Section>

        <Section title={t("filter.minRating")}>
          <div className="flex flex-wrap gap-1.5">
            <Chip label={t("filter.any")} active={!minRating} onClick={() => update({ minRating: null })} />
            {[4, 3, 2].map((r) => (
              <Chip key={r} label={`${r}★ +`} active={minRating === String(r)} onClick={() => update({ minRating: String(r) })} />
            ))}
          </div>
        </Section>
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ks-text-muted)]">{title}</h3>
      {children}
    </div>
  );
}

function Select({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: LocationOptions["states"];
  onChange: (value: string | null) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-[var(--ks-text-faint)]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full rounded-lg border bg-transparent px-2.5 py-2 text-sm text-[var(--ks-text)]"
        style={{ borderColor: "var(--ks-border-strong)" }}
      >
        <option value="" className="bg-[var(--ks-bg-elevated)]">
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[var(--ks-bg-elevated)]">
            {o.label} ({o.count.toLocaleString("en-IN")})
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm text-[var(--ks-text-muted)]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--ks-coral)]" />
      <span>
        {label}
        {hint && <span className="block text-[11px] text-[var(--ks-text-faint)]">{hint}</span>}
      </span>
    </label>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-2.5 py-1 text-xs transition-colors"
      style={
        active
          ? { borderColor: "var(--ks-coral)", color: "var(--ks-coral)", background: "oklch(28% 0.05 25 / 0.15)" }
          : { borderColor: "var(--ks-border)", color: "var(--ks-text-muted)" }
      }
    >
      {label}
    </button>
  );
}

function FilterOption({ label, active, indent, onClick }: { label: string; active: boolean; indent?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1.5 text-start text-sm transition-colors ${indent ? "ms-3 text-xs" : ""}`}
      style={active ? { background: "oklch(28% 0.05 25 / 0.4)", color: "var(--ks-coral)" } : { color: "var(--ks-text-muted)" }}
    >
      {label}
    </button>
  );
}
