import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentGraphNode } from "@/components/multi-agent/agent-network-graph";

interface DelegationRecord {
  source_bot_id: string;
  target_bot_id: string;
  task: string;
  status: string;
  result: unknown;
  created_at: string;
  completed_at: string | null;
}

interface PairStats {
  succeeded: number;
  failed: number;
  latencyTotalMs: number;
  latencyCount: number;
  costTotal: number;
  costCount: number;
  lastTask: string | null;
}

/** Rolls a workspace's delegation history up into per-(source,target)-pair
 * stats — extracted as a pure function so the aggregation math (success
 * rate, averaging, "most recent task wins" since delegations arrive
 * newest-first) is unit-testable without mocking Supabase. */
export function aggregateDelegationStats(delegations: DelegationRecord[]): Map<string, PairStats> {
  const statsByPair = new Map<string, PairStats>();
  for (const d of delegations) {
    const key = `${d.source_bot_id}:${d.target_bot_id}`;
    const entry = statsByPair.get(key) ?? { succeeded: 0, failed: 0, latencyTotalMs: 0, latencyCount: 0, costTotal: 0, costCount: 0, lastTask: null };
    if (entry.lastTask === null) entry.lastTask = d.task;
    if (d.status === "succeeded") {
      entry.succeeded += 1;
      if (d.completed_at) { entry.latencyTotalMs += new Date(d.completed_at).getTime() - new Date(d.created_at).getTime(); entry.latencyCount += 1; }
      const cost = Number((d.result as { usage?: { estimatedCostUsd?: number } } | null)?.usage?.estimatedCostUsd ?? NaN);
      if (Number.isFinite(cost)) { entry.costTotal += cost; entry.costCount += 1; }
    } else if (d.status === "failed") {
      entry.failed += 1;
    }
    statsByPair.set(key, entry);
  }
  return statsByPair;
}

/** Turns one pair's raw totals into the card-ready node fields — null
 * when there's no relevant history yet, rather than a misleading 0. */
export function pairStatsToNode(stats: PairStats | undefined): { task: string | null; latencyMs: number | null; costUsd: number | null; successRatePct: number | null } {
  const totalCompleted = (stats?.succeeded ?? 0) + (stats?.failed ?? 0);
  return {
    task: stats?.lastTask ?? null,
    latencyMs: stats && stats.latencyCount > 0 ? Math.round(stats.latencyTotalMs / stats.latencyCount) : null,
    costUsd: stats && stats.costCount > 0 ? stats.costTotal / stats.costCount : null,
    successRatePct: totalCompleted > 0 ? Math.round((( stats?.succeeded ?? 0) / totalCompleted) * 100) : null,
  };
}

export interface SupervisorNetwork {
  supervisorId: string;
  supervisorName: string;
  specialists: AgentGraphNode[];
}

/**
 * Static relationship network (Multi-Agent page) — every supervisor that
 * has at least one connected specialist, with each specialist's card
 * stats (spec section 77: status/task/latency/cost/success rate) rolled
 * up from its actual delegation history rather than a single run.
 */
export async function getAgentNetworks(workspaceId: string): Promise<SupervisorNetwork[]> {
  const admin = createAdminClient();
  const [{ data: relationships }, { data: bots }, { data: delegations }] = await Promise.all([
    admin.from("agent_relationships").select("source_bot_id,target_bot_id,role,enabled").eq("workspace_id", workspaceId).order("priority", { ascending: true }),
    admin.from("bots").select("id,name").eq("workspace_id", workspaceId),
    admin.from("agent_delegations").select("source_bot_id,target_bot_id,task,status,result,created_at,completed_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(500),
  ]);
  if (!relationships || relationships.length === 0) return [];

  const nameById = new Map((bots ?? []).map((b) => [b.id, b.name]));
  const statsByPair = aggregateDelegationStats(delegations ?? []);

  const bySupervisor = new Map<string, typeof relationships>();
  for (const rel of relationships) {
    const list = bySupervisor.get(rel.source_bot_id) ?? [];
    list.push(rel);
    bySupervisor.set(rel.source_bot_id, list);
  }

  return [...bySupervisor.entries()].map(([supervisorId, rels]) => ({
    supervisorId,
    supervisorName: nameById.get(supervisorId) ?? "Unknown agent",
    specialists: rels.map((rel): AgentGraphNode => ({
      id: rel.target_bot_id,
      name: nameById.get(rel.target_bot_id) ?? "Unknown agent",
      status: rel.enabled ? "enabled" : "disabled",
      ...pairStatsToNode(statsByPair.get(`${rel.source_bot_id}:${rel.target_bot_id}`)),
    })),
  }));
}

export interface RecentOrchestrationRun {
  runId: string;
  status: string;
  supervisorId: string;
  supervisorName: string;
  specialists: AgentGraphNode[];
}

/**
 * Most recent orchestration run's live execution graph (Orchestration
 * page) — per-step status/latency/cost from multi_agent_run_steps,
 * which the engine already writes in real time as each specialist runs.
 */
export async function getMostRecentOrchestrationRun(workspaceId: string): Promise<RecentOrchestrationRun | null> {
  const admin = createAdminClient();
  const { data: run } = await admin.from("multi_agent_runs").select("id,source_bot_id,status").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!run) return null;

  const [{ data: steps }, { data: bots }] = await Promise.all([
    admin.from("multi_agent_run_steps").select("agent_id,task,status,output,started_at,completed_at").eq("run_id", run.id).order("step_index", { ascending: true }),
    admin.from("bots").select("id,name").eq("workspace_id", workspaceId),
  ]);
  const nameById = new Map((bots ?? []).map((b) => [b.id, b.name]));

  return {
    runId: run.id,
    status: run.status,
    supervisorId: run.source_bot_id,
    supervisorName: nameById.get(run.source_bot_id) ?? "Unknown agent",
    specialists: (steps ?? []).map((s): AgentGraphNode => {
      const latencyMs = s.started_at && s.completed_at ? new Date(s.completed_at).getTime() - new Date(s.started_at).getTime() : null;
      const cost = Number((s.output as { usage?: { estimatedCostUsd?: number } } | null)?.usage?.estimatedCostUsd ?? NaN);
      return {
        id: s.agent_id,
        name: nameById.get(s.agent_id) ?? "Unknown agent",
        status: s.status,
        task: s.task,
        latencyMs,
        costUsd: Number.isFinite(cost) ? cost : null,
        successRatePct: null, // this is a single run, not an aggregate — the relationship graph is where the historical rate belongs
      };
    }),
  };
}
