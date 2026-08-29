/**
 * Chatbo design system — loading skeletons (spec section 88).
 * "Use skeletons that match the actual layout. Do not show generic
 * 'Loading...' text for everything." These compose into the six named
 * examples (dashboard/agent/conversation/analytics/table/chart) as
 * page-level loading.tsx files, which Next.js's App Router shows
 * automatically while a route's server components are fetching —
 * no client JS, no manual loading-state wiring.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-elevated ${className}`} />;
}

export function MetricCardSkeleton() {
  return (
    <div className="rounded-2xl border border-mist bg-surface p-5">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-7 w-16" />
      <Skeleton className="mt-2 h-3 w-24" />
    </div>
  );
}

export function ChartSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <div className={`flex ${height} w-full items-end gap-2 rounded-xl border border-mist bg-surface p-4`}>
      {[40, 65, 50, 80, 55, 70, 45, 90, 60, 75, 50, 85].map((h, i) => (
        <div key={i} className="flex-1 animate-pulse rounded-t-sm bg-elevated" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-mist bg-surface">
      <div className="flex gap-4 border-b border-mist px-5 py-3">
        {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} className="h-3 flex-1" />)}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-mist px-5 py-4 last:border-0">
          {Array.from({ length: cols }).map((_, c) => <Skeleton key={c} className="h-3.5 flex-1" />)}
        </div>
      ))}
    </div>
  );
}

export function CardListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-mist bg-surface p-4">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
