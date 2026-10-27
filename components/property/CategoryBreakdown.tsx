import type { DbMetric } from "@/lib/db/properties";
import { brand } from "@/lib/brand";

export function CategoryBreakdown({ metrics }: { metrics: DbMetric[] }) {
  if (metrics.length === 0) {
    return <p className="text-xs text-[var(--ks-text-faint)]">No ratings yet.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {metrics.map((m) => {
        const pct = (m.average / 5) * 100;
        return (
          <div key={m.key} className="flex items-center gap-3">
            <span className="w-44 shrink-0 text-xs text-[var(--ks-text-muted)] sm:w-56">
              {m.label}
              <span className="ml-1 text-[var(--ks-text-faint)]">({m.count})</span>
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--ks-border-soft)" }}>
              <div
                className="h-1.5 rounded-full"
                style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${brand.coral}, ${brand.magenta})` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-xs font-semibold text-[var(--ks-text)]">{m.average.toFixed(1)}</span>
          </div>
        );
      })}
    </div>
  );
}
