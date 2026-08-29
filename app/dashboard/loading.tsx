import { Skeleton, MetricCardSkeleton, ChartSkeleton, CardListSkeleton } from "@/components/ui/skeleton";

// "Dashboard skeleton" — mirrors the real dashboard's actual shape:
// greeting header + CTAs, 4 metric cards, an agent-card row, a big
// chart beside a usage panel, then two more list panels, then quick
// actions — not a generic spinner.
export default function DashboardLoading() {
  return (
    <main className="space-y-6 px-6 py-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-96" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-40 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)}
      </div>
      <div className="rounded-2xl border border-mist bg-surface p-5">
        <Skeleton className="mb-4 h-4 w-28" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-mist bg-surface p-5 lg:col-span-2">
          <Skeleton className="mb-4 h-4 w-32" />
          <ChartSkeleton />
        </div>
        <div className="rounded-2xl border border-mist bg-surface p-5">
          <Skeleton className="mb-4 h-4 w-24" />
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="mt-2 h-3 w-2/3" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-mist bg-surface p-5 lg:col-span-2">
          <Skeleton className="mb-4 h-4 w-40" />
          <CardListSkeleton count={4} />
        </div>
        <div className="rounded-2xl border border-mist bg-surface p-5">
          <Skeleton className="mb-4 h-4 w-28" />
          <CardListSkeleton count={4} />
        </div>
      </div>
      <div className="rounded-2xl border border-mist bg-surface p-5">
        <Skeleton className="mb-4 h-4 w-28" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    </main>
  );
}
