import Link from "next/link";
import { Suspense } from "react";
import { searchProperties } from "@/lib/db/properties";
import { getCategoryTree } from "@/lib/db/categories";
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
  const categories = await getCategoryTree();
  const results = await searchProperties({
    q: searchParams.q,
    category: searchParams.category,
    minRating: searchParams.minRating ? Number(searchParams.minRating) : undefined,
    sort: (searchParams.sort as "rating_desc" | "review_count_desc" | "newest") ?? "rating_desc",
  });

  return (
    <main style={{ background: brand.navy, minHeight: "100vh" }}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-xl font-bold text-[var(--ks-text)]">
          {searchParams.q ? `Results for "${searchParams.q}"` : "All businesses"}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--ks-text-muted)" }}>
          {results.length} business{results.length === 1 ? "" : "es"} found
        </p>

        <div className="mt-6 flex flex-col gap-6 sm:flex-row">
          <Suspense fallback={null}>
            <FilterSidebar categories={categories} />
          </Suspense>

          <div className="flex-1">
            {results.length === 0 ? (
              <div
                className="rounded-xl border p-8 text-center text-sm"
                style={{ borderColor: "var(--ks-border)", color: "var(--ks-text-faint)" }}
              >
                No businesses matched your search. Try a different name or locality, or clear a filter.
                <p className="mt-3">
                  <Link
                    href={`/business/new${searchParams.q ? `?name=${encodeURIComponent(searchParams.q)}` : ""}`}
                    className="font-semibold text-[var(--ks-text)] underline"
                  >
                    Can&apos;t find it? Add the business
                  </Link>
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))}
              </div>
            )}
            {results.length > 0 && (
              <p className="mt-6 text-center text-xs text-[var(--ks-text-faint)]">
                Not here?{" "}
                <Link href="/business/new" className="underline">
                  Add a business
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
