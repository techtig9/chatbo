import { Skeleton } from "@/components/ui/skeleton";

// "Agent skeleton" — spec section 88's named example. Mirrors the real
// Agents grid (Phase 8): filter pills, search box, then a grid of
// agent-card-shaped placeholders (avatar, title, badge, stat row, footer).
export default function AgentsLoading() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-2 h-8 w-40" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-7 w-20 rounded-lg" />)}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-mist bg-surface p-5">
            <div className="flex items-start justify-between">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="mt-4 h-5 w-2/3" />
            <Skeleton className="mt-2 h-3 w-full" />
            <Skeleton className="mt-1 h-3 w-4/5" />
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-mist pt-3">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
