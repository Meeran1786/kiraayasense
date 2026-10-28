import Link from "next/link";
import {
  Building2,
  Car,
  Plane,
  Laptop,
  GraduationCap,
  HeartPulse,
  Landmark,
  Wifi,
  ShoppingBag,
  UtensilsCrossed,
  Bus,
  Wrench,
  Home,
  ScrollText,
  Store,
  type LucideIcon,
} from "lucide-react";
import { getCategoryTree } from "@/lib/db/categories";

// Icons for the seeded top-level categories; categories admins add later
// fall back to a generic storefront.
const ICONS: Record<string, LucideIcon> = {
  housing: Building2,
  automotive: Car,
  aerospace: Plane,
  "it-ites": Laptop,
  education: GraduationCap,
  healthcare: HeartPulse,
  "banking-finance": Landmark,
  telecom: Wifi,
  "ecommerce-retail": ShoppingBag,
  "food-hospitality": UtensilsCrossed,
  "travel-transport": Bus,
  "home-services": Wrench,
  "real-estate": Home,
  "government-utilities": ScrollText,
};

export async function CategoryChips() {
  const categories = await getCategoryTree();

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h2 className="mb-4 text-sm font-semibold text-[var(--ks-text)]">Browse by category</h2>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
        {categories.map((c) => {
          const Icon = ICONS[c.slug] ?? Store;
          return (
            <Link
              key={c.slug}
              href={`/search?category=${c.slug}`}
              className="flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center transition-colors hover:border-[var(--ks-border-strong)]"
              style={{ borderColor: "var(--ks-border)", background: "var(--ks-bg-elevated)" }}
            >
              <Icon size={20} className="text-[var(--ks-text-muted)]" />
              <span className="text-[11px] font-medium leading-tight text-[var(--ks-text-muted)]">{c.name}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
