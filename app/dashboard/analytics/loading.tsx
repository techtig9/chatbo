import { Skeleton, MetricCardSkeleton, ChartSkeleton } from "@/components/ui/skeleton";

// "Analytics skeleton" — spec section 88's named example. Mirrors the
// real analytics page (Phase 13): 6 KPI cards, a wide chart, then two
// rows of supporting panels.
export default function AnalyticsLoading() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="mt-2 h-8 w-96" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <MetricCardSkeleton key={i} />)}
      </div>
      <div className="mt-6 rounded-2xl border border-mist bg-surface p-5">
        <Skeleton className="mb-4 h-4 w-48" />
        <ChartSkeleton />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-mist bg-surface p-5">
            <Skeleton className="mb-4 h-4 w-36" />
            <Skeleton className="h-32 w-full" />
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-mist bg-surface p-5">
            <Skeleton className="mb-4 h-4 w-24" />
            <Skeleton className="h-24 w-full" />
          </div>
        ))}
      </div>
    </main>
  );
}
