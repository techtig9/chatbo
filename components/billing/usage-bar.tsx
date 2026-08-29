import type { UsageBar } from "@/lib/data/billing-usage";

export function UsageBarRow({ bar }: { bar: UsageBar }) {
  const notAvailable = bar.limit === -1;
  const hasHardLimit = bar.limit !== null && bar.limit !== -1;
  const pct = hasHardLimit && bar.limit! > 0 ? Math.min(100, Math.round((bar.used / bar.limit!) * 100)) : 0;
  const nearLimit = hasHardLimit && pct >= 90;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="font-medium text-ink">{bar.label}</span>
        {notAvailable ? (
          <span className="text-xs text-slate">Not available on your plan</span>
        ) : hasHardLimit ? (
          <span className="text-xs text-slate">{bar.used.toLocaleString()} / {bar.limit!.toLocaleString()} {bar.unit}</span>
        ) : (
          <span className="text-xs text-slate">{bar.used.toLocaleString()} {bar.unit}</span>
        )}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
        {notAvailable ? (
          <div className="h-full w-full bg-mist" />
        ) : hasHardLimit ? (
          <div className={`h-full rounded-full ${nearLimit ? "bg-danger" : "bg-signal"}`} style={{ width: `${pct}%` }} />
        ) : (
          // No enforced limit — a fixed, non-proportional accent so it
          // reads as "tracked" without implying an approaching ceiling
          // that doesn't exist.
          <div className="h-full w-1/4 rounded-full bg-accent2" />
        )}
      </div>
    </div>
  );
}
