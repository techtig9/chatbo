import { Skeleton } from "@/components/ui/skeleton";

// More specific than app/dashboard/bots/loading.tsx (the Agents grid
// skeleton) — without this, Next.js would show that grid-shaped skeleton
// here too, which looks nothing like the real three-panel Agent Builder
// (Phase 10) this route actually renders. A wrong-shaped skeleton is the
// exact "does not match the actual layout" failure spec section 88 warns
// against, so every page shape gets its own loading.tsx rather than
// inheriting whatever the nearest ancestor happens to have.
export default function AgentBuilderLoading() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      <nav className="w-52 shrink-0 space-y-1 border-r border-mist bg-surface p-3">
        {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
      </nav>
      <div className="flex-1 space-y-6 overflow-hidden p-6">
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
        </div>
      </div>
      <aside className="hidden w-96 shrink-0 border-l border-mist p-4 sm:block">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="mt-3 h-20 w-3/4 rounded-2xl" />
        <Skeleton className="mt-3 ml-auto h-14 w-2/3 rounded-2xl" />
      </aside>
    </div>
  );
}
