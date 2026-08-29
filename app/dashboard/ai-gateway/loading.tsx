import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

// "Table skeleton" — spec section 88's named example, demonstrated here
// since this page has a genuine data table (recent model activity)
// alongside its provider cards.
export default function AIGatewayLoading() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-2 h-8 w-72" />
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
      </div>
      <div className="mt-8">
        <Skeleton className="mb-3 h-4 w-40" />
        <TableSkeleton rows={6} cols={6} />
      </div>
    </main>
  );
}
