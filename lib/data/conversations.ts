import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ConversationStatus = "active" | "ended";
export type ConversationSentiment = "positive" | "negative" | "neutral" | null;

export interface ConversationListItem {
  id: string;
  botId: string;
  botName: string;
  botAvatar: string | null;
  channel: string;
  visitorId: string;
  startedAt: string;
  lastMessageAt: string | null;
  messageCount: number;
  lastMessagePreview: string | null;
  status: ConversationStatus;
  isUnread: boolean;
  sentiment: ConversationSentiment;
  isHandoff: boolean;
}

/**
 * Workspace-wide conversation list, newest activity first — joins
 * through bots (RLS-scoped to the caller's workspace) rather than
 * requiring a bot_id, since the top-level "Conversations" nav item shows
 * everything across every bot in the workspace. Enriched for the Phase
 * 11 Conversations UI (spec section 73): status derives from ended_at
 * (no separate "resolved" flag exists in the schema), unread from the
 * new read_at column, sentiment from aggregated message feedback, and
 * handoff from whether the handoff_to_human tool was ever invoked in
 * this conversation.
 */
export async function listRecentConversations(
  workspaceId: string,
  limit: number = 100
): Promise<ConversationListItem[]> {
  const supabase = createClient();

  const { data: bots } = await supabase
    .from("bots")
    .select("id, name, avatar")
    .eq("workspace_id", workspaceId);

  if (!bots || bots.length === 0) return [];

  const botIds = bots.map((b) => b.id);
  const botById = new Map(bots.map((b) => [b.id, b]));

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, bot_id, channel, visitor_id, started_at, ended_at, read_at")
    .in("bot_id", botIds)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (!conversations || conversations.length === 0) return [];

  const conversationIds = conversations.map((c) => c.id);
  const [{ data: messages }, { data: handoffRows }] = await Promise.all([
    supabase.from("messages").select("conversation_id, content, role, feedback, created_at").in("conversation_id", conversationIds).order("created_at", { ascending: false }),
    supabase.from("tool_executions").select("conversation_id").in("conversation_id", conversationIds).eq("tool_key", "handoff_to_human"),
  ]);

  const messagesByConversation = new Map<string, { content: string; role: string; feedback: string | null; created_at: string }[]>();
  for (const m of messages ?? []) {
    const list = messagesByConversation.get(m.conversation_id) ?? [];
    list.push(m);
    messagesByConversation.set(m.conversation_id, list);
  }
  const handoffConversationIds = new Set((handoffRows ?? []).map((r) => r.conversation_id));

  return conversations.map((c) => {
    const msgs = messagesByConversation.get(c.id) ?? [];
    const hasDown = msgs.some((m) => m.feedback === "down");
    const hasUp = msgs.some((m) => m.feedback === "up");
    const bot = botById.get(c.bot_id);
    return {
      id: c.id,
      botId: c.bot_id,
      botName: bot?.name ?? "Unknown bot",
      botAvatar: bot?.avatar ?? null,
      channel: c.channel,
      visitorId: c.visitor_id,
      startedAt: c.started_at,
      lastMessageAt: msgs[0]?.created_at ?? null,
      messageCount: msgs.length,
      lastMessagePreview: msgs[0]?.content.slice(0, 100) ?? null,
      status: c.ended_at ? "ended" : "active",
      isUnread: !c.read_at,
      sentiment: hasDown ? "negative" : hasUp ? "positive" : "neutral",
      isHandoff: handoffConversationIds.has(c.id),
    };
  });
}

export interface ConversationDetail {
  id: string;
  botId: string;
  botName: string;
  botAvatar: string | null;
  channel: string;
  visitorId: string;
  startedAt: string;
  endedAt: string | null;
  status: ConversationStatus;
  isHandoff: boolean;
  visitorConversationCount: number;
  messages: {
    id: string;
    role: "user" | "assistant";
    content: string;
    feedback: "up" | "down" | null;
    citations: unknown;
    createdAt: string;
  }[];
}

export async function getConversationDetail(
  conversationId: string
): Promise<ConversationDetail | null> {
  const supabase = createClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, bot_id, channel, visitor_id, started_at, ended_at, bots(name, avatar)")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conversation) return null;

  const botsRelation = conversation.bots as unknown;
  const botInfo = Array.isArray(botsRelation)
    ? (botsRelation[0] as { name?: string; avatar?: string } | undefined)
    : (botsRelation as { name?: string; avatar?: string } | null);

  const [{ data: messages }, { count: visitorConversationCount }, { data: handoffRows }] = await Promise.all([
    supabase.from("messages").select("id, role, content, feedback, citations, created_at").eq("conversation_id", conversationId).order("created_at", { ascending: true }),
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("bot_id", conversation.bot_id).eq("visitor_id", conversation.visitor_id),
    supabase.from("tool_executions").select("id").eq("conversation_id", conversationId).eq("tool_key", "handoff_to_human").limit(1),
  ]);

  return {
    id: conversation.id,
    botId: conversation.bot_id,
    botName: botInfo?.name ?? "Unknown bot",
    botAvatar: botInfo?.avatar ?? null,
    channel: conversation.channel,
    visitorId: conversation.visitor_id,
    startedAt: conversation.started_at,
    endedAt: conversation.ended_at,
    status: conversation.ended_at ? "ended" : "active",
    isHandoff: (handoffRows ?? []).length > 0,
    visitorConversationCount: visitorConversationCount ?? 1,
    messages: (messages ?? []).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      feedback: m.feedback,
      citations: m.citations,
      createdAt: m.created_at,
    })),
  };
}
