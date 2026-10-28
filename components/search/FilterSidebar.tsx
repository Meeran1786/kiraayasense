"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { CategoryNode } from "@/lib/db/categories";

export function FilterSidebar({ categories }: { categories: CategoryNode[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const category = searchParams.get("category");
  const minRating = searchParams.get("minRating");
  const sort = searchParams.get("sort") ?? "rating_desc";

  // The selected category's top-level parent, so its sub-categories stay
  // listed whether the parent or one of its children is selected.
  const openTop = categories.find((c) => c.slug === category || c.children.some((s) => s.slug === category));

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
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ks-text-muted)]">Category</h3>
        <div className="flex flex-col gap-1.5">
          <FilterOption label="All categories" active={!category} onClick={() => updateParam("category", null)} />
          {categories.map((c) => (
            <div key={c.slug} className="flex flex-col gap-1">
              <FilterOption label={c.name} active={category === c.slug} onClick={() => updateParam("category", c.slug)} />
              {openTop?.slug === c.slug &&
                c.children.map((s) => (
                  <FilterOption
                    key={s.slug}
                    label={s.name}
                    indent
                    active={category === s.slug}
                    onClick={() => updateParam("category", s.slug)}
                  />
                ))}
            </div>
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

function FilterOption({
  label,
  active,
  indent,
  onClick,
}: {
  label: string;
  active: boolean;
  indent?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${indent ? "ml-3 text-xs" : ""}`}
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
