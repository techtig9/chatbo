import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AuditAction } from "@/lib/audit/log";

export interface DashboardMetrics {
  totalConversations: number;
  conversationsTrendPct: number | null;
  successRatePct: number | null;
  totalAgents: number;
  totalAgentsPublished: number;
  aiCostUsd: number;
  aiCostTrendPct: number | null;
}

export interface ConversationSeriesPoint {
  date: string;
  conversations: number;
  users: number;
}

export interface TopAgent {
  id: string;
  name: string;
  avatar: string | null;
  conversationCount: number;
  growthPct: number | null;
  status: "draft" | "published";
  createdAt: string;
}

export interface RecentConversation {
  id: string;
  botId: string;
  botName: string;
  topic: string;
  timestamp: string;
  status: "active" | "ended";
  sentiment: "up" | "down" | null;
}

export interface ActivityItem {
  id: string;
  createdAt: string;
  category: "knowledge" | "agent" | "workflow" | "integration" | "evaluation" | "security" | "other";
  label: string;
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? null : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

const ACTIVITY_LABELS: Partial<Record<AuditAction, string>> = {
  "knowledge_source.added": "Knowledge source added",
  "knowledge_source.reindexed": "Knowledge source reindexed",
  "bot.published": "Agent published",
  "bot.deployed.production": "Agent deployed to production",
  "bot.deployed.staging": "Agent deployed to staging",
  "workflow.activated": "Workflow deployed",
  "integration.connected": "Integration connected",
  "evaluation.completed": "Evaluation completed",
  "workspace.mfa_requirement_changed": "Two-factor requirement changed",
  "member.role_changed": "Member role changed",
  "api_key.created": "API key created",
  "api_key.revoked": "API key revoked",
};

const SECURITY_ACTIONS = new Set<AuditAction>([
  "workspace.mfa_requirement_changed",
  "member.role_changed",
  "member.removed",
  "api_key.created",
  "api_key.revoked",
  "organization.member_role_changed",
]);

export function categorize(action: AuditAction): ActivityItem["category"] {
  if (action.startsWith("knowledge_source.")) return "knowledge";
  if (action.startsWith("bot.")) return "agent";
  if (action.startsWith("workflow.")) return "workflow";
  if (action.startsWith("integration.")) return "integration";
  if (action.startsWith("evaluation.")) return "evaluation";
  if (SECURITY_ACTIONS.has(action)) return "security";
  return "other";
}

/** Metric cards row (spec section 67). */
export async function getDashboardMetrics(workspaceId: string): Promise<DashboardMetrics> {
  const supabase = createClient();
  const now = new Date();
  const periodStart = new Date(now.getTime() - 7 * 86400000);
  const priorPeriodStart = new Date(now.getTime() - 14 * 86400000);

  const { data: bots } = await supabase.from("bots").select("id, status").eq("workspace_id", workspaceId);
  const botIds = (bots ?? []).map((b) => b.id);
  const totalAgents = botIds.length;
  const totalAgentsPublished = (bots ?? []).filter((b) => b.status === "published").length;

  if (botIds.length === 0) {
    return { totalConversations: 0, conversationsTrendPct: null, successRatePct: null, totalAgents: 0, totalAgentsPublished: 0, aiCostUsd: 0, aiCostTrendPct: null };
  }

  const [{ count: totalConversations }, { count: currentPeriodConvos }, { count: priorPeriodConvos }, { data: feedbackRows }, currentCost, priorCost] = await Promise.all([
    supabase.from("conversations").select("id", { count: "exact", head: true }).in("bot_id", botIds),
    supabase.from("conversations").select("id", { count: "exact", head: true }).in("bot_id", botIds).gte("started_at", periodStart.toISOString()),
    supabase.from("conversations").select("id", { count: "exact", head: true }).in("bot_id", botIds).gte("started_at", priorPeriodStart.toISOString()).lt("started_at", periodStart.toISOString()),
    supabase.from("messages").select("feedback, conversation_id").not("feedback", "is", null).in("conversation_id", (await supabase.from("conversations").select("id").in("bot_id", botIds)).data?.map((c) => c.id) ?? []),
    supabase.from("ai_usage_records").select("estimated_cost_usd").eq("workspace_id", workspaceId).gte("created_at", periodStart.toISOString()),
    supabase.from("ai_usage_records").select("estimated_cost_usd").eq("workspace_id", workspaceId).gte("created_at", priorPeriodStart.toISOString()).lt("created_at", periodStart.toISOString()),
  ]);

  const up = (feedbackRows ?? []).filter((m) => m.feedback === "up").length;
  const down = (feedbackRows ?? []).filter((m) => m.feedback === "down").length;
  const successRatePct = up + down > 0 ? Math.round((up / (up + down)) * 1000) / 10 : null;

  const currentCostSum = (currentCost.data ?? []).reduce((s, r) => s + Number(r.estimated_cost_usd), 0);
  const priorCostSum = (priorCost.data ?? []).reduce((s, r) => s + Number(r.estimated_cost_usd), 0);

  return {
    totalConversations: totalConversations ?? 0,
    conversationsTrendPct: pctChange(currentPeriodConvos ?? 0, priorPeriodConvos ?? 0),
    successRatePct,
    totalAgents,
    totalAgentsPublished,
    aiCostUsd: currentCostSum,
    aiCostTrendPct: pctChange(currentCostSum, priorCostSum),
  };
}

/** Conversation volume chart (spec section 68). */
export async function getConversationSeries(workspaceId: string, days = 30): Promise<ConversationSeriesPoint[]> {
  const supabase = createClient();
  const since = new Date(Date.now() - days * 86400000);

  const { data: bots } = await supabase.from("bots").select("id").eq("workspace_id", workspaceId);
  const botIds = (bots ?? []).map((b) => b.id);
  const points: ConversationSeriesPoint[] = Array.from({ length: days }, (_, i) => {
    const d = new Date(since.getTime() + i * 86400000);
    return { date: d.toISOString().slice(0, 10), conversations: 0, users: 0 };
  });
  if (botIds.length === 0) return points;

  const { data: conversations } = await supabase.from("conversations").select("started_at, visitor_id").in("bot_id", botIds).gte("started_at", since.toISOString());
  const byDate = new Map(points.map((p) => [p.date, p]));
  const usersByDate = new Map<string, Set<string>>();
  for (const c of conversations ?? []) {
    const date = c.started_at.slice(0, 10);
    const point = byDate.get(date);
    if (!point) continue;
    point.conversations += 1;
    if (!usersByDate.has(date)) usersByDate.set(date, new Set());
    usersByDate.get(date)!.add(c.visitor_id);
  }
  for (const p of points) p.users = usersByDate.get(p.date)?.size ?? 0;
  return points;
}

/** Top Agents list (spec section 68). */
export async function getTopAgents(workspaceId: string, limit = 5): Promise<TopAgent[]> {
  const supabase = createClient();
  const periodStart = new Date(Date.now() - 7 * 86400000);
  const priorPeriodStart = new Date(Date.now() - 14 * 86400000);

  const { data: bots } = await supabase.from("bots").select("id, name, avatar, status, created_at").eq("workspace_id", workspaceId);
  if (!bots || bots.length === 0) return [];

  const results = await Promise.all(
    bots.map(async (bot) => {
      const [{ count: total }, { count: current }, { count: prior }] = await Promise.all([
        supabase.from("conversations").select("id", { count: "exact", head: true }).eq("bot_id", bot.id),
        supabase.from("conversations").select("id", { count: "exact", head: true }).eq("bot_id", bot.id).gte("started_at", periodStart.toISOString()),
        supabase.from("conversations").select("id", { count: "exact", head: true }).eq("bot_id", bot.id).gte("started_at", priorPeriodStart.toISOString()).lt("started_at", periodStart.toISOString()),
      ]);
      return { id: bot.id, name: bot.name, avatar: bot.avatar, conversationCount: total ?? 0, growthPct: pctChange(current ?? 0, prior ?? 0), status: bot.status as "draft" | "published", createdAt: bot.created_at };
    })
  );

  return results.sort((a, b) => b.conversationCount - a.conversationCount).slice(0, limit);
}

/** Recent Conversations list (spec section 68). */
export async function getRecentConversations(workspaceId: string, limit = 8): Promise<RecentConversation[]> {
  const supabase = createClient();
  const { data: bots } = await supabase.from("bots").select("id, name").eq("workspace_id", workspaceId);
  const botIds = (bots ?? []).map((b) => b.id);
  if (botIds.length === 0) return [];
  const botNames = new Map((bots ?? []).map((b) => [b.id, b.name]));

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, bot_id, visitor_id, started_at, ended_at")
    .in("bot_id", botIds)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (!conversations || conversations.length === 0) return [];

  const results = await Promise.all(
    conversations.map(async (c) => {
      const { data: firstUserMessage } = await supabase.from("messages").select("content").eq("conversation_id", c.id).eq("role", "user").order("created_at", { ascending: true }).limit(1).maybeSingle();
      const { data: ratedMessages } = await supabase.from("messages").select("feedback").eq("conversation_id", c.id).not("feedback", "is", null).limit(1);
      return {
        id: c.id,
        botId: c.bot_id,
        botName: botNames.get(c.bot_id) ?? "Unknown agent",
        topic: firstUserMessage?.content?.slice(0, 80) ?? "No messages yet",
        timestamp: c.started_at,
        status: c.ended_at ? "ended" : "active",
        sentiment: (ratedMessages?.[0]?.feedback as "up" | "down" | undefined) ?? null,
      } satisfies RecentConversation;
    })
  );
  return results;
}

/** Activity Feed (spec section 68) — reads the audit log, which Phase 7
 * extended with workflow.activated / integration.connected /
 * evaluation.completed so every category the spec asks for is actually
 * captured, not just the ones earlier phases happened to log. */
export async function getActivityFeed(workspaceId: string, limit = 12): Promise<ActivityItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("id, action, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? [])
    .filter((row) => ACTIVITY_LABELS[row.action as AuditAction])
    .map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      category: categorize(row.action as AuditAction),
      label: ACTIVITY_LABELS[row.action as AuditAction]!,
    }));
}
