import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { gatewayComplete } from "@/lib/ai/gateway";
import { delegateToAgent } from "@/lib/agents/collaboration";

export type OrchestrationMode = "parallel" | "sequential" | "supervisor";
export type AgentPlanStep = { agentId: string; task: string; dependsOn?: string[] };

const DEFAULT_MAX_DEPTH = 3;
const DEFAULT_MAX_AGENTS = 6;
const DEFAULT_MAX_COST_USD = 2;

function safeJson(text: string): unknown {
  try { return JSON.parse(text); } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) { try { return JSON.parse(match[0]); } catch {} }
    return null;
  }
}

async function policy(workspaceId: string, sourceBotId: string) {
  const admin = createAdminClient();
  const { data } = await (admin as any).from("agent_orchestration_policies")
    .select("max_depth,max_agents,max_cost_usd,allow_parallel,allow_dynamic_selection")
    .eq("workspace_id", workspaceId).eq("bot_id", sourceBotId).maybeSingle();
  return {
    maxDepth: Math.min(10, Math.max(1, Number(data?.max_depth ?? DEFAULT_MAX_DEPTH))),
    maxAgents: Math.min(20, Math.max(1, Number(data?.max_agents ?? DEFAULT_MAX_AGENTS))),
    maxCostUsd: Math.max(0, Number(data?.max_cost_usd ?? DEFAULT_MAX_COST_USD)),
    allowParallel: data?.allow_parallel ?? true,
    allowDynamicSelection: data?.allow_dynamic_selection ?? true,
  };
}

async function getTargets(workspaceId: string, sourceBotId: string) {
  const admin = createAdminClient();
  const { data } = await (admin as any).from("agent_relationships")
    .select("target_bot_id,role,max_calls,max_input_chars,priority")
    .eq("workspace_id", workspaceId).eq("source_bot_id", sourceBotId).eq("enabled", true)
    .order("priority", { ascending: true });
  const ids = (data ?? []).map((r: any) => r.target_bot_id);
  if (!ids.length) return [];
  const { data: bots } = await admin.from("bots").select("id,name,description,system_prompt,status,agent_config").eq("workspace_id", workspaceId).in("id", ids);
  return (bots ?? []).filter((b: any) => b.status !== "archived").map((b: any) => ({ ...b, relationship: (data ?? []).find((r: any) => r.target_bot_id === b.id) }));
}

function assertPlan(plan: AgentPlanStep[], targets: any[], maxAgents: number) {
  if (!plan.length) throw new Error("Supervisor produced an empty agent plan");
  if (plan.length > maxAgents) throw new Error(`Orchestration exceeds the ${maxAgents}-agent limit`);
  const allowed = new Set(targets.map((t) => t.id));
  const seen = new Set<string>();
  for (const step of plan) {
    if (!allowed.has(step.agentId)) throw new Error("Supervisor selected an agent that is not explicitly connected");
    if (seen.has(step.agentId)) throw new Error("An agent cannot be selected twice in one orchestration plan");
    if (!step.task || step.task.length > Number(targets.find((t) => t.id === step.agentId)?.relationship?.max_input_chars ?? 12000)) throw new Error("A delegated task is invalid or too large");
    seen.add(step.agentId);
  }
  return plan;
}

async function makeSupervisorPlan(args: { task: string; targets: any[]; maxAgents: number }) {
  const catalog = args.targets.map((t) => ({ id: t.id, name: t.name, description: t.description, role: t.relationship?.role, priority: t.relationship?.priority ?? 100 }));
  const response = await gatewayComplete({
    system: "You are Chatbo's orchestration planner. Choose only from the supplied connected agents. Return ONLY valid JSON: {\"steps\":[{\"agentId\":\"...\",\"task\":\"...\",\"dependsOn\":[]}]}. Use at most the requested number of agents. Never invent agent IDs. Keep tasks concise.",
    messages: [{ role: "user", content: `Main task:\n${args.task}\n\nConnected agents:\n${JSON.stringify(catalog)}\n\nMaximum agents: ${args.maxAgents}` }],
    mode: "balanced",
  });
  const parsed: any = safeJson(response.text);
  const plan = Array.isArray(parsed?.steps) ? parsed.steps.map((s: any) => ({ agentId: String(s.agentId || ""), task: String(s.task || ""), dependsOn: Array.isArray(s.dependsOn) ? s.dependsOn.map(String) : [] })) : [];
  return assertPlan(plan, args.targets, args.maxAgents);
}

function detectCycle(plan: AgentPlanStep[]) {
  const graph = new Map(plan.map((s) => [s.agentId, new Set(s.dependsOn ?? [])]));
  const visiting = new Set<string>(); const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true; if (visited.has(id)) return false;
    visiting.add(id); for (const dep of graph.get(id) ?? []) if (graph.has(dep) && visit(dep)) return true;
    visiting.delete(id); visited.add(id); return false;
  };
  for (const id of graph.keys()) if (visit(id)) return true;
  return false;
}

async function recordStep(runId: string, workspaceId: string, step: AgentPlanStep, index: number, status: string, output?: any, error?: string, startedAt?: string) {
  const admin = createAdminClient();
  await (admin as any).from("multi_agent_run_steps").upsert({ run_id: runId, workspace_id: workspaceId, step_index: index, agent_id: step.agentId, task: step.task, depends_on: step.dependsOn ?? [], status, output: output ?? null, error: error ?? null, started_at: startedAt ?? new Date().toISOString(), completed_at: ["succeeded","failed","cancelled"].includes(status) ? new Date().toISOString() : null }, { onConflict: "run_id,step_index" });
}

export async function orchestrateAgents(args: { workspaceId: string; sourceBotId: string; task: string; mode?: OrchestrationMode; context?: Record<string, unknown>; depth?: number; idempotencyKey?: string }) {
  const admin = createAdminClient();
  const p = await policy(args.workspaceId, args.sourceBotId);
  const depth = Number(args.depth ?? 0);
  if (depth >= p.maxDepth) throw new Error(`Maximum delegation depth of ${p.maxDepth} reached`);
  const targets = await getTargets(args.workspaceId, args.sourceBotId);
  if (!targets.length) throw new Error("No enabled specialist agents are connected to this supervisor");
  if (args.mode === "parallel" && !p.allowParallel) throw new Error("Parallel orchestration is disabled for this agent");
  const mode = args.mode ?? "supervisor";
  const plan = mode === "supervisor" && p.allowDynamicSelection
    ? await makeSupervisorPlan({ task: args.task, targets, maxAgents: p.maxAgents })
    : assertPlan(targets.slice(0, p.maxAgents).map((t: any) => ({ agentId: t.id, task: args.task, dependsOn: [] })), targets, p.maxAgents);
  if (detectCycle(plan)) throw new Error("Orchestration plan contains a dependency cycle");

  const { data: run, error } = await (admin as any).from("multi_agent_runs").insert({ workspace_id: args.workspaceId, source_bot_id: args.sourceBotId, task: args.task, context: args.context ?? {}, mode, status: "running", max_depth: p.maxDepth, max_agents: p.maxAgents, max_cost_usd: p.maxCostUsd, depth, idempotency_key: args.idempotencyKey ?? null }).select("id").single();
  if (error || !run) throw new Error(error?.message || "Could not create orchestration run");

  const results: Record<string, any> = {};
  let totalCost = 0;
  try {
    const execute = async (step: AgentPlanStep, index: number) => {
      for (const dep of step.dependsOn ?? []) if (!results[dep]) throw new Error(`Dependency ${dep} did not produce a result`);
      const started = new Date().toISOString(); await recordStep(run.id, args.workspaceId, step, index, "running", undefined, undefined, started);
      try {
        const result = await delegateToAgent({ workspaceId: args.workspaceId, sourceBotId: args.sourceBotId, targetBotId: step.agentId, task: step.task, context: { ...(args.context ?? {}), orchestration: { runId: run.id, depth, mode, priorResults: results } } });
        const cost = Number(result.usage?.estimatedCostUsd ?? 0); totalCost += Number.isFinite(cost) ? cost : 0;
        if (totalCost > p.maxCostUsd) throw new Error(`Orchestration cost budget of $${p.maxCostUsd} exceeded`);
        results[step.agentId] = result;
        await recordStep(run.id, args.workspaceId, step, index, "succeeded", result, undefined, started);
        return result;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Agent step failed";
        await recordStep(run.id, args.workspaceId, step, index, "failed", undefined, message, started); throw e;
      }
    };

    if (mode === "parallel") {
      const settled = await Promise.allSettled(plan.map((s, i) => execute(s, i)));
      const failed = settled.find((s) => s.status === "rejected") as PromiseRejectedResult | undefined;
      if (failed) throw failed.reason;
    } else {
      const pending = new Set(plan.map((_, i) => i));
      while (pending.size) {
        // Non-null assertions: `i` is always a valid index into `plan` here
        // — `pending` is built directly from plan.map((_, i) => i) above and
        // only ever shrinks, so plan[i] can't actually be undefined; TS just
        // can't prove that through the Set/array indirection.
        const ready = [...pending].filter((i) => (plan[i]!.dependsOn ?? []).every((dep) => results[dep]));
        if (!ready.length) throw new Error("Orchestration dependencies cannot be resolved");
        if (mode === "sequential") {
          for (const i of ready.sort((a,b) => a-b)) { await execute(plan[i]!, i); pending.delete(i); }
        } else {
          await Promise.all(ready.map((i) => execute(plan[i]!, i))); ready.forEach((i) => pending.delete(i));
        }
      }
    }
    const summary = Object.values(results).map((r: any) => r?.text ?? r?.result ?? r).join("\n\n");
    const aggregate = await gatewayComplete({ system: "You are the supervisor of a multi-agent system. Synthesize specialist results into one accurate, concise answer. Do not invent facts or claim actions not present in the results.", messages: [{ role: "user", content: `Original task:\n${args.task}\n\nSpecialist results:\n${summary}` }], mode: "balanced" });
    totalCost += Number(aggregate.usage?.estimatedCostUsd ?? 0);
    if (totalCost > p.maxCostUsd) throw new Error(`Orchestration cost budget of $${p.maxCostUsd} exceeded`);
    await (admin as any).from("multi_agent_runs").update({ status: "succeeded", plan, results, final_result: aggregate, total_cost_usd: totalCost, completed_at: new Date().toISOString() }).eq("id", run.id);
    return { runId: run.id, status: "succeeded", plan, results, final: aggregate, totalCost };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Orchestration failed";
    await (admin as any).from("multi_agent_runs").update({ status: "failed", plan, results, total_cost_usd: totalCost, error: message, completed_at: new Date().toISOString() }).eq("id", run.id);
    throw new Error(message);
  }
}
