"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CATEGORY_LABELS, CATEGORY_ORDER, type PropertyCategory } from "@/lib/constants";

export function FilterSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const category = searchParams.get("category") as PropertyCategory | null;
  const minRating = searchParams.get("minRating");
  const sort = searchParams.get("sort") ?? "rating_desc";

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 sm:w-56">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ks-text-muted)]">Sort by</h3>
        <select
          value={sort}
          onChange={(e) => updateParam("sort", e.target.value)}
          className="w-full rounded-lg border bg-transparent px-2.5 py-2 text-sm text-[var(--ks-text)]"
          style={{ borderColor: "var(--ks-border-strong)" }}
        >
          <option value="rating_desc" className="bg-[var(--ks-bg-elevated)]">Highest rated</option>
          <option value="review_count_desc" className="bg-[var(--ks-bg-elevated)]">Most reviewed</option>
          <option value="newest" className="bg-[var(--ks-bg-elevated)]">Newest</option>
        </select>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ks-text-muted)]">Accommodation type</h3>
        <div className="flex flex-col gap-1.5">
          <FilterOption
            label="All types"
            active={!category}
            onClick={() => updateParam("category", null)}
          />
          {CATEGORY_ORDER.map((c) => (
            <FilterOption
              key={c}
              label={CATEGORY_LABELS[c]}
              active={category === c}
              onClick={() => updateParam("category", c)}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ks-text-muted)]">Minimum rating</h3>
        <div className="flex flex-col gap-1.5">
          <FilterOption label="Any rating" active={!minRating} onClick={() => updateParam("minRating", null)} />
          {[4, 3, 2].map((r) => (
            <FilterOption
              key={r}
              label={`${r}+ stars`}
              active={minRating === String(r)}
              onClick={() => updateParam("minRating", String(r))}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

function FilterOption({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors"
      style={
        active
          ? { background: "oklch(28% 0.05 25 / 0.4)", color: "oklch(85% 0.1 25)" }
          : { color: "var(--ks-text-muted)" }
      }
    >
      {label}
    </button>
  );
}
