"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndWorkspace } from "@/lib/data/workspace";

/**
 * Marks a conversation as read (spec section 73's Unread tab). Scoped to
 * the caller's workspace via the bots join, same belt-and-suspenders
 * pattern used elsewhere in this codebase alongside RLS. Silently
 * no-ops on failure — viewing a conversation should never block on this.
 */
export async function markConversationRead(conversationId: string): Promise<void> {
  const { workspace } = await getCurrentUserAndWorkspace();
  if (!workspace) return;

  const supabase = createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, bots!inner(workspace_id)")
    .eq("id", conversationId)
    .eq("bots.workspace_id", workspace.workspaceId)
    .maybeSingle();
  if (!conversation) return;

  await supabase.from("conversations").update({ read_at: new Date().toISOString() }).eq("id", conversationId).is("read_at", null);
  revalidatePath("/dashboard/conversations");
}
