import { Suspense } from "react";
import { searchProperties } from "@/lib/db/properties";
import type { PropertyCategory } from "@/lib/constants";
import { PropertyCard } from "@/components/property/PropertyCard";
import { FilterSidebar } from "@/components/search/FilterSidebar";
import { Footer } from "@/components/layout/Footer";
import { brand } from "@/lib/brand";

interface SearchPageProps {
  searchParams: {
    q?: string;
    category?: string;
    minRating?: string;
    sort?: string;
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const results = await searchProperties({
    q: searchParams.q,
    category: searchParams.category as PropertyCategory | undefined,
    minRating: searchParams.minRating ? Number(searchParams.minRating) : undefined,
    sort: (searchParams.sort as "rating_desc" | "review_count_desc" | "newest") ?? "rating_desc",
  });

  return (
    <main style={{ background: brand.navy, minHeight: "100vh" }}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-xl font-bold text-[var(--ks-text)]">
          {searchParams.q ? `Results for "${searchParams.q}"` : "All properties"}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--ks-text-muted)" }}>
          {results.length} propert{results.length === 1 ? "y" : "ies"} found
        </p>

        <div className="mt-6 flex flex-col gap-6 sm:flex-row">
          <Suspense fallback={null}>
            <FilterSidebar />
          </Suspense>

          <div className="flex-1">
            {results.length === 0 ? (
              <div
                className="rounded-xl border p-8 text-center text-sm"
                style={{ borderColor: "var(--ks-border)", color: "var(--ks-text-faint)" }}
              >
                No properties matched your search. Try a different locality or clear a filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
