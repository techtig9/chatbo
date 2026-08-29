import { Skeleton } from "@/components/ui/skeleton";

// "Conversation skeleton" — spec section 88's named example. Mirrors the
// real three-panel layout (Phase 11): a list of conversation-card
// placeholders on the left, a message-bubble shaped placeholder in the
// center — not a blank screen or a spinner.
export default function ConversationsLoading() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      <div className="w-80 shrink-0 space-y-1 border-r border-mist bg-surface p-3">
        <Skeleton className="h-8 w-full rounded-lg" />
        <div className="flex gap-2 py-2">
          <Skeleton className="h-6 w-12 rounded-lg" />
          <Skeleton className="h-6 w-16 rounded-lg" />
          <Skeleton className="h-6 w-20 rounded-lg" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-2.5 w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <Skeleton className="h-5 w-40" />
        <div className="mt-6 space-y-4">
          <Skeleton className="h-12 w-2/3 rounded-2xl" />
          <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
          <Skeleton className="h-16 w-3/4 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
