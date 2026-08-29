import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface WorkspaceAnalytics {
  totalBots: number;
  totalConversations: number;
  totalMessages: number;
  feedbackUp: number;
  feedbackDown: number;
  mostAskedQuestions: { question: string; count: number }[];
}

/**
 * Aggregates in application code rather than a dedicated SQL view —
 * fine at this scale (a workspace's own bot/message volume), and a
 * clearer place to iterate on "most asked" grouping logic (currently
 * exact-text match after normalizing case/whitespace, not semantic
 * clustering) than burying it in a stored procedure. Revisit as a real
 * materialized view if a workspace's message volume ever makes this
 * query slow.
 */
export async function getWorkspaceAnalytics(workspaceId: string): Promise<WorkspaceAnalytics> {
  const supabase = createClient();

  const { data: bots } = await supabase.from("bots").select("id").eq("workspace_id", workspaceId);
  const botIds = (bots ?? []).map((b) => b.id);

  if (botIds.length === 0) {
    return {
      totalBots: 0,
      totalConversations: 0,
      totalMessages: 0,
      feedbackUp: 0,
      feedbackDown: 0,
      mostAskedQuestions: [],
    };
  }

  const { count: totalConversations } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .in("bot_id", botIds);

  const { data: conversationIdRows } = await supabase
    .from("conversations")
    .select("id")
    .in("bot_id", botIds);
  const conversationIds = (conversationIdRows ?? []).map((c) => c.id);

  if (conversationIds.length === 0) {
    return {
      totalBots: botIds.length,
      totalConversations: totalConversations ?? 0,
      totalMessages: 0,
      feedbackUp: 0,
      feedbackDown: 0,
      mostAskedQuestions: [],
    };
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("role, content, feedback")
    .in("conversation_id", conversationIds);

  const allMessages = messages ?? [];
  const userQuestions = allMessages.filter((m) => m.role === "user");

  const counts = new Map<string, { display: string; count: number }>();
  for (const m of userQuestions) {
    const key = m.content.trim().toLowerCase();
    if (!key) continue;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { display: m.content.trim(), count: 1 });
    }
  }

  const mostAskedQuestions = Array.from(counts.values())
    .filter((c) => c.count > 1) // a question asked exactly once isn't a pattern worth surfacing
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((c) => ({ question: c.display, count: c.count }));

  return {
    totalBots: botIds.length,
    totalConversations: totalConversations ?? 0,
    totalMessages: allMessages.length,
    feedbackUp: allMessages.filter((m) => m.feedback === "up").length,
    feedbackDown: allMessages.filter((m) => m.feedback === "down").length,
    mostAskedQuestions,
  };
}
