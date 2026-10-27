import { GRIEVANCE_CATEGORIES, type GrievanceCategoryKey } from "@/lib/reviewValidation";
import { brand } from "@/lib/brand";

export function CategoryBreakdown({
  categoryAverages,
}: {
  categoryAverages: Record<GrievanceCategoryKey, number>;
}) {
  return (
    <div className="flex flex-col gap-3">
      {GRIEVANCE_CATEGORIES.map((c) => {
        const value = categoryAverages[c.key];
        const pct = (value / 5) * 100;
        return (
          <div key={c.key} className="flex items-center gap-3">
            <span className="w-44 shrink-0 text-xs text-[var(--ks-text-muted)] sm:w-56">{c.label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--ks-border-soft)" }}>
              <div
                className="h-1.5 rounded-full"
                style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${brand.coral}, ${brand.magenta})` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-xs font-semibold text-[var(--ks-text)]">{value.toFixed(1)}</span>
          </div>
        );
      })}
    </div>
  );
}
