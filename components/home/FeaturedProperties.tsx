import Link from "next/link";
import { getFeaturedProperties } from "@/lib/db/properties";
import { PropertyCard } from "@/components/property/PropertyCard";
import { brand } from "@/lib/brand";

export async function FeaturedProperties() {
  const properties = await getFeaturedProperties(6);

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-sm font-semibold text-[var(--ks-text)]">Top-rated by reviewers</h2>
        <Link href="/search" className="text-xs font-semibold" style={{ color: brand.coral }}>
          View all →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {properties.map((p) => (
          <PropertyCard key={p.id} property={p} />
        ))}
      </div>
    </section>
  );
}
