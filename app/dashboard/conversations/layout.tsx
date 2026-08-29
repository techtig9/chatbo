import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";
import { listRecentConversations } from "@/lib/data/conversations";
import { ConversationList } from "@/components/conversations/conversation-list";

export default async function ConversationsLayout({ children }: { children: React.ReactNode }) {
  const { workspace } = await getCurrentUserAndWorkspace();
  const conversations = workspace ? await listRecentConversations(workspace.workspaceId) : [];

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      <ConversationList conversations={conversations} />
      <div className="flex flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
