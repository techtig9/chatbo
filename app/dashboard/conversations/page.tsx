import { MessagesSquare } from "lucide-react";

export default function ConversationsIndexPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
      <MessagesSquare size={28} className="text-slate" aria-hidden="true" />
      <p className="text-sm text-slate">Select a conversation to view it here.</p>
    </div>
  );
}
