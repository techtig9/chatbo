import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceOwner } from "./workspace-owner";
import { sendEmail } from "@/lib/email/resend";
import { weeklyDigestEmail } from "@/lib/email/templates";

export interface DigestStats {
  workspaceName: string;
  conversationCount: number;
  messageCount: number;
  creditsUsed: number;
  creditsRemaining: number;
}

/**
 * Aggregates the last 7 days of activity for one workspace. Real query
 * logic, structurally identical to getWorkspaceAnalytics (Phase 1.6)
 * but time-boxed to a week instead of all-time — kept as its own
 * function rather than adding a date param to the analytics one, since
 * "what happened this week" and "workspace totals" are different
 * enough questions to deserve separate, simpler functions.
 */
export async function getWeeklyDigestStats(workspaceId: string): Promise<DigestStats | null> {
  const supabase = createAdminClient();

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", workspaceId)
    .maybeSingle();
  if (!workspace) return null;

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("credits_remaining")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const { data: bots } = await supabase.from("bots").select("id").eq("workspace_id", workspaceId);
  const botIds = (bots ?? []).map((b) => b.id);

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  if (botIds.length === 0) {
    return {
      workspaceName: workspace.name,
      conversationCount: 0,
      messageCount: 0,
      creditsUsed: 0,
      creditsRemaining: subscription?.credits_remaining ?? 0,
    };
  }

  const { count: conversationCount } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .in("bot_id", botIds)
    .gte("started_at", weekAgo);

  const { data: conversationIdRows } = await supabase
    .from("conversations")
    .select("id")
    .in("bot_id", botIds)
    .gte("started_at", weekAgo);
  const conversationIds = (conversationIdRows ?? []).map((c) => c.id);

  const { count: messageCount } =
    conversationIds.length > 0
      ? await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .in("conversation_id", conversationIds)
      : { count: 0 };

  return {
    workspaceName: workspace.name,
    conversationCount: conversationCount ?? 0,
    messageCount: messageCount ?? 0,
    creditsUsed: (messageCount ?? 0) * 10, // approximate — messageExchange cost; ingestion/API costs aren't broken out separately here
    creditsRemaining: subscription?.credits_remaining ?? 0,
  };
}

export interface DigestSendResult {
  sent: number;
  totalWorkspaces: number;
}

/**
 * Sends the weekly digest to every workspace's owner, skipping
 * genuinely empty weeks. Extracted as its own function so both the
 * manually-triggerable HTTP route and the real Inngest scheduled
 * function call the exact same logic.
 */
export async function sendWeeklyDigestToAllWorkspaces(): Promise<DigestSendResult> {
  const supabase = createAdminClient();
  const { data: workspaces } = await supabase.from("workspaces").select("id");

  let sent = 0;
  for (const workspace of workspaces ?? []) {
    const stats = await getWeeklyDigestStats(workspace.id);
    const owner = await getWorkspaceOwner(workspace.id);
    if (!stats || !owner) continue;

    // Skip a genuinely empty week — nobody needs a "0 conversations,
    // 0 messages" email every Monday, that trains people to ignore it.
    if (stats.conversationCount === 0 && stats.messageCount === 0) continue;

    const email = weeklyDigestEmail(stats);
    await sendEmail({ to: owner.email, subject: email.subject, html: email.html });
    sent++;
  }

  return { sent, totalWorkspaces: workspaces?.length ?? 0 };
}
