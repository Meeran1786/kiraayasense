import Link from "next/link";
import { MapPin } from "lucide-react";
import { getPopularLocalities } from "@/lib/db/properties";

export async function PopularLocalities() {
  const popularLocalities = await getPopularLocalities();
  if (popularLocalities.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h2 className="mb-4 text-sm font-semibold text-[var(--ks-text)]">Popular localities in Bengaluru</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {popularLocalities.map((loc) => (
          <Link
            key={loc.name}
            href={`/search?q=${encodeURIComponent(loc.name)}`}
            className="flex items-center gap-2 rounded-xl border px-3 py-3 transition-colors hover:border-[var(--ks-border-strong)]"
            style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}
          >
            <MapPin size={14} className="shrink-0 text-[var(--ks-text-muted)]" />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[var(--ks-text)]">{loc.name}</p>
              <p className="text-[11px] text-[var(--ks-text-faint)]">{loc.propertyCount} properties</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
