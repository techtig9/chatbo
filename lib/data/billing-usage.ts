import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_LIMITS } from "@/lib/billing/plans";
import type { Plan } from "@/lib/supabase/types";

export interface UsageBar {
  label: string;
  used: number;
  limit: number | null; // null = no enforced limit — shown as an informational count, not a percentage
  unit: string;
}

export interface PaymentRecord {
  id: string;
  amount: number | null;
  status: string | null;
  createdAt: string;
}

/** Pure — turns raw counts into the 6 usage bars spec section 80 asks
 * for. Separated from the data-fetching so the "which bars get a real
 * percentage vs an informational count" rule is unit-testable. */
export function buildUsageBars(args: {
  plan: Plan;
  creditsRemaining: number;
  botCount: number;
  seatCount: number;
  knowledgeDocCount: number;
  conversationCountThisPeriod: number;
  apiCallCountThisPeriod: number;
}): UsageBar[] {
  const limits = PLAN_LIMITS[args.plan];
  const creditsUsed = Math.max(0, limits.monthlyCredits - args.creditsRemaining);
  const knowledgeDocLimit = limits.maxKnowledgeDocsPerBot === null ? null : limits.maxKnowledgeDocsPerBot * Math.max(1, args.botCount);

  return [
    { label: "Conversations", used: args.conversationCountThisPeriod, limit: null, unit: "this period" },
    { label: "AI Credits", used: creditsUsed, limit: limits.monthlyCredits, unit: "credits" },
    { label: "Storage", used: args.knowledgeDocCount, limit: knowledgeDocLimit, unit: "docs" },
    { label: "Agents", used: args.botCount, limit: limits.maxBots, unit: "agents" },
    { label: "Seats", used: args.seatCount, limit: limits.maxSeats, unit: "seats" },
    {
      label: "API Calls",
      used: args.apiCallCountThisPeriod,
      limit: limits.features.publicApi === "none" ? -1 : null, // -1 is a sentinel: "not available on this plan," distinct from "unlimited"
      unit: "this period",
    },
  ];
}

export interface BillingOverview {
  usageBars: UsageBar[];
  payments: PaymentRecord[];
}

export async function getBillingOverview(workspaceId: string, plan: Plan, creditsRemaining: number, periodStart: Date): Promise<BillingOverview> {
  const admin = createAdminClient();

  const { data: bots, count: botCount } = await admin.from("bots").select("id", { count: "exact" }).eq("workspace_id", workspaceId);
  const botIds = (bots ?? []).map((b) => b.id);

  const [{ count: seatCount }, { count: conversationCount }, { count: apiCallCount }, { count: knowledgeDocCount }, { data: payments }] = await Promise.all([
    admin.from("workspace_members").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    botIds.length ? admin.from("conversations").select("id", { count: "exact", head: true }).gte("started_at", periodStart.toISOString()).in("bot_id", botIds) : Promise.resolve({ count: 0 }),
    botIds.length ? admin.from("conversations").select("id", { count: "exact", head: true }).eq("channel", "api").gte("started_at", periodStart.toISOString()).in("bot_id", botIds) : Promise.resolve({ count: 0 }),
    botIds.length ? admin.from("knowledge_sources").select("id", { count: "exact", head: true }).in("bot_id", botIds) : Promise.resolve({ count: 0 }),
    admin.from("payments").select("id, amount, status, created_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(12),
  ]);

  const usageBars = buildUsageBars({
    plan,
    creditsRemaining,
    botCount: botCount ?? 0,
    seatCount: seatCount ?? 0,
    knowledgeDocCount: knowledgeDocCount ?? 0,
    conversationCountThisPeriod: conversationCount ?? 0,
    apiCallCountThisPeriod: apiCallCount ?? 0,
  });

  return {
    usageBars,
    payments: (payments ?? []).map((p) => ({ id: p.id, amount: p.amount, status: p.status, createdAt: p.created_at })),
  };
}
