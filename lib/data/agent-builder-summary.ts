import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface AgentBuilderSummary {
  knowledge: { total: number; ready: number; processing: number; failed: number };
  channels: { total: number; names: string[] };
  evaluations: { lastScore: number | null; lastStatus: string | null; lastRunAt: string | null };
  deployment: { productionVersion: number | null; stagingVersion: number | null };
  versions: { versionNumber: number; createdAt: string }[];
}

/** Lightweight summary data for the Agent Builder's non-inline tabs
 * (Knowledge, Channels, Evaluations, Deployment, Versions) — each tab
 * shows this at-a-glance instead of duplicating the full page it links
 * to (spec section 71's ten tabs; Memory and Security link straight
 * through without a stats summary since neither has a cheap, meaningful
 * single-number rollup the way source/channel/eval counts do). */
export async function getAgentBuilderSummary(botId: string): Promise<AgentBuilderSummary> {
  const supabase = createClient();

  const [knowledgeRows, channelRows, lastEval, deployments, versionRows] = await Promise.all([
    supabase.from("knowledge_sources").select("status").eq("bot_id", botId),
    supabase.from("channel_connections").select("channel").eq("bot_id", botId).eq("status", "connected"),
    supabase.from("eval_runs").select("score, status, completed_at").eq("bot_id", botId).order("completed_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("bot_deployments").select("environment, version:bot_versions(version_number)").eq("bot_id", botId).eq("status", "active"),
    supabase.from("bot_versions").select("version_number, created_at").eq("bot_id", botId).order("version_number", { ascending: false }).limit(5),
  ]);

  const knowledge = { total: 0, ready: 0, processing: 0, failed: 0 };
  for (const row of knowledgeRows.data ?? []) {
    knowledge.total += 1;
    if (row.status === "ready") knowledge.ready += 1;
    else if (row.status === "processing" || row.status === "indexing") knowledge.processing += 1;
    else if (row.status === "failed") knowledge.failed += 1;
  }

  const productionDeployment = (deployments.data ?? []).find((d) => d.environment === "production") as { version: { version_number: number } | null } | undefined;
  const stagingDeployment = (deployments.data ?? []).find((d) => d.environment === "staging") as { version: { version_number: number } | null } | undefined;

  return {
    knowledge,
    channels: { total: (channelRows.data ?? []).length, names: (channelRows.data ?? []).map((c) => c.channel) },
    evaluations: { lastScore: lastEval.data?.score ?? null, lastStatus: lastEval.data?.status ?? null, lastRunAt: lastEval.data?.completed_at ?? null },
    deployment: { productionVersion: productionDeployment?.version?.version_number ?? null, stagingVersion: stagingDeployment?.version?.version_number ?? null },
    versions: (versionRows.data ?? []).map((v) => ({ versionNumber: v.version_number, createdAt: v.created_at })),
  };
}
