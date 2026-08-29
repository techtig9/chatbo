import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface AgentListItem {
  id: string;
  name: string;
  description: string | null;
  useCase: string;
  status: "draft" | "published" | "archived";
  avatar: string | null;
  version: number | null;
  conversationCount: number;
  successRatePct: number | null;
  lastActiveAt: string | null;
  channels: string[];
  ownerName: string | null;
  needsAttention: boolean;
}

/**
 * "Needs attention" (spec section 69's filter) is a published agent with
 * at least one knowledge source that failed to index — a concrete,
 * actionable, cheaply-computable definition rather than a vague health
 * score. A draft agent with a failed source isn't flagged: it isn't
 * serving anyone yet, so there's nothing urgent about it.
 */
export async function listAgentsForWorkspace(workspaceId: string): Promise<AgentListItem[]> {
  const supabase = createClient();

  const { data: bots } = await supabase
    .from("bots")
    .select("id, name, description, use_case, status, avatar, created_by")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (!bots || bots.length === 0) return [];

  const botIds = bots.map((b) => b.id);
  const ownerIds = [...new Set(bots.map((b) => b.created_by).filter((id): id is string => Boolean(id)))];

  const [versionRows, conversationRows, channelRows, ownerRows, failedKnowledgeRows] = await Promise.all([
    supabase.from("bot_versions").select("bot_id, version_number").in("bot_id", botIds).order("version_number", { ascending: false }),
    supabase.from("conversations").select("id, bot_id, started_at").in("bot_id", botIds),
    supabase.from("channel_connections").select("bot_id, channel").in("bot_id", botIds).eq("status", "connected"),
    ownerIds.length ? supabase.from("users").select("id, name").in("id", ownerIds) : Promise.resolve({ data: [] as { id: string; name: string | null }[] }),
    supabase.from("knowledge_sources").select("bot_id").in("bot_id", botIds).eq("status", "failed"),
  ]);

  const latestVersionByBot = new Map<string, number>();
  for (const row of versionRows.data ?? []) {
    if (!latestVersionByBot.has(row.bot_id)) latestVersionByBot.set(row.bot_id, row.version_number);
  }

  const conversationsByBot = new Map<string, { id: string; started_at: string }[]>();
  for (const row of conversationRows.data ?? []) {
    const list = conversationsByBot.get(row.bot_id) ?? [];
    list.push({ id: row.id, started_at: row.started_at });
    conversationsByBot.set(row.bot_id, list);
  }

  const allConversationIds = (conversationRows.data ?? []).map((c) => c.id);
  const { data: feedbackRows } = allConversationIds.length
    ? await supabase.from("messages").select("conversation_id, feedback").not("feedback", "is", null).in("conversation_id", allConversationIds)
    : { data: [] as { conversation_id: string; feedback: string }[] };
  const conversationToBot = new Map((conversationRows.data ?? []).map((c) => [c.id, c.bot_id]));
  const feedbackByBot = new Map<string, { up: number; down: number }>();
  for (const row of feedbackRows ?? []) {
    const botId = conversationToBot.get(row.conversation_id);
    if (!botId) continue;
    const tally = feedbackByBot.get(botId) ?? { up: 0, down: 0 };
    if (row.feedback === "up") tally.up += 1;
    else if (row.feedback === "down") tally.down += 1;
    feedbackByBot.set(botId, tally);
  }

  const channelsByBot = new Map<string, string[]>();
  for (const row of channelRows.data ?? []) {
    const list = channelsByBot.get(row.bot_id) ?? [];
    if (!list.includes(row.channel)) list.push(row.channel);
    channelsByBot.set(row.bot_id, list);
  }

  const ownerNameById = new Map((ownerRows.data ?? []).map((u) => [u.id, u.name]));
  const failedKnowledgeBotIds = new Set((failedKnowledgeRows.data ?? []).map((r) => r.bot_id));

  return bots.map((bot) => {
    const conversations = conversationsByBot.get(bot.id) ?? [];
    const lastActiveAt = conversations.length
      ? conversations.reduce((latest, c) => (c.started_at > latest ? c.started_at : latest), conversations[0]!.started_at)
      : null;
    const feedback = feedbackByBot.get(bot.id);
    const successRatePct = feedback && feedback.up + feedback.down > 0 ? Math.round((feedback.up / (feedback.up + feedback.down)) * 1000) / 10 : null;

    return {
      id: bot.id,
      name: bot.name,
      description: bot.description,
      useCase: bot.use_case,
      status: bot.status as AgentListItem["status"],
      avatar: bot.avatar,
      version: latestVersionByBot.get(bot.id) ?? null,
      conversationCount: conversations.length,
      successRatePct,
      lastActiveAt,
      channels: channelsByBot.get(bot.id) ?? [],
      ownerName: bot.created_by ? (ownerNameById.get(bot.created_by) ?? null) : null,
      needsAttention: bot.status === "published" && failedKnowledgeBotIds.has(bot.id),
    };
  });
}
