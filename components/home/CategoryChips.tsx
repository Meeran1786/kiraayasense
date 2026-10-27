import Link from "next/link";
import { Building2, Home, Users, BedDouble, Hotel, Crown, type LucideIcon } from "lucide-react";
import { CATEGORY_LABELS, CATEGORY_ORDER, type PropertyCategory } from "@/lib/constants";

const ICONS: Record<PropertyCategory, LucideIcon> = {
  FLAT: Building2,
  INDEPENDENT_HOUSE: Home,
  PG: Users,
  HOSTEL: BedDouble,
  HOTEL_BUDGET: Hotel,
  HOTEL_LUXURY: Crown,
};

export function CategoryChips() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h2 className="mb-4 text-sm font-semibold text-[var(--ks-text)]">Browse by type</h2>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {CATEGORY_ORDER.map((c) => {
          const Icon = ICONS[c];
          return (
            <Link
              key={c}
              href={`/search?category=${c}`}
              className="flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center transition-colors hover:border-[var(--ks-border-strong)]"
              style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}
            >
              <Icon size={20} className="text-[var(--ks-text-muted)]" />
              <span className="text-[11px] font-medium leading-tight text-[var(--ks-text-muted)]">{CATEGORY_LABELS[c]}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
