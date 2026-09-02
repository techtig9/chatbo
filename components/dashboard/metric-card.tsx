import type { LucideIcon } from "lucide-react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Card } from "@/components/ui/card";

export function MetricCard({
  icon: Icon,
  label,
  value,
  trendPct,
  comparisonPeriod = "vs last 7 days",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  trendPct?: number | null;
  comparisonPeriod?: string;
}) {
  const trendKnown = trendPct !== undefined && trendPct !== null;
  const isPositive = trendKnown && trendPct >= 0;

  return (
    <Card variant="metric">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate">{label}</p>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-signal-soft text-ink">
          <Icon size={14} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold text-ink">{value}</p>
      {trendKnown ? (
        <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${isPositive ? "text-success" : "text-danger"}`}>
          {isPositive ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />}
          {Math.abs(trendPct).toFixed(1)}%
          <span className="font-normal text-slate">{comparisonPeriod}</span>
        </p>
      ) : (
        <p className="mt-1 text-xs text-slate">{comparisonPeriod}</p>
      )}
    </Card>
  );
}
