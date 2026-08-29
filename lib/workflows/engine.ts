import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { gatewayComplete } from "@/lib/ai/gateway";
import { sendEmail } from "@/lib/email/resend";
import type { WorkflowDefinition, WorkflowNode } from "./types";
import { delegateToAgent } from "@/lib/agents/collaboration";
import { retrieveForQuery } from "@/lib/knowledge/retrieve";
import { executeTool } from "@/lib/tools/executor";

function interpolate(value: unknown, ctx: Record<string, unknown>): unknown {
  if (typeof value !== "string") return value;
  return value.replace(/{{\s*([^}]+)\s*}}/g, (_, path) => {
    const parts = String(path).split(".");
    let cur: any = ctx;
    for (const part of parts) cur = cur?.[part];
    return cur == null ? "" : typeof cur === "object" ? JSON.stringify(cur) : String(cur);
  });
}
function interpolateObject(value: unknown, ctx: Record<string, unknown>): any {
  if (Array.isArray(value)) return value.map((v) => interpolateObject(v, ctx));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k,v]) => [k, interpolateObject(v, ctx)]));
  return interpolate(value, ctx);
}

function nextNodes(def: WorkflowDefinition, nodeId: string, label?: string) {
  return def.edges.filter((e) => e.source === nodeId && (!label || e.label === label || e.label === "default")).map((e) => e.target);
}

export async function runWorkflow(workflowId: string, workspaceId: string, input: Record<string, unknown>, triggerType = "manual", existingRunId?: string, runtime?: { sleep?: (id: string, ms: number) => Promise<unknown> }) {
  const admin = createAdminClient();
  const { data: workflow, error } = await admin.from("workflows").select("id,workspace_id,status,trigger_type,nodes,edges").eq("id", workflowId).eq("workspace_id", workspaceId).single();
  if (error || !workflow) throw new Error("Workflow not found");
  if (workflow.status !== "active" && triggerType !== "manual") throw new Error("Workflow is not active");

  const started = Date.now();
  let run: { id: string } | null = null;
  if (existingRunId) {
    const { data: existing } = await admin.from("workflow_runs").select("id,status,started_at").eq("id", existingRunId).eq("workflow_id", workflowId).eq("workspace_id", workspaceId).single();
    if (!existing) throw new Error("Workflow run not found");
    run = { id: existing.id };
    if (existing.status !== "awaiting_approval" && existing.status !== "queued" && existing.status !== "running") throw new Error("Workflow run is not resumable");
    await admin.from("workflow_runs").update({ status: "running", error: null, completed_at: null, started_at: existing.started_at ?? new Date().toISOString() }).eq("id", run.id);
  } else {
    const { data: created, error: runError } = await admin.from("workflow_runs").insert({ workflow_id: workflowId, workspace_id: workspaceId, trigger_type: triggerType, status: "running", input, started_at: new Date().toISOString() }).select("id").single();
    if (runError || !created) throw new Error(runError?.message || "Could not start workflow");
    run = created;
  }

  const def: WorkflowDefinition = { nodes: (workflow.nodes || []) as WorkflowNode[], edges: (workflow.edges || []) as any[] };
  const byId = new Map(def.nodes.map((n) => [n.id, n]));
  const ctx: Record<string, any> = { input, vars: {}, last: null };
  let queue = def.nodes.filter((n) => n.type === "trigger").map((n) => n.id);
  if (!queue.length) queue = def.nodes.slice(0, 1).map((n) => n.id);
  const visited = new Set<string>();
  const completed = new Map<string, any>();
  if (existingRunId) {
    const { data: priorSteps } = await admin.from("workflow_run_steps").select("node_id,status,output").eq("run_id", existingRunId).eq("status", "succeeded");
    for (const step of priorSteps ?? []) completed.set(step.node_id, step.output);
  }
  let output: unknown = null;
  try {
    let steps = 0;
    while (queue.length && steps < 50) {
      const nodeId = queue.shift()!;
      const { data: runState } = await admin.from("workflow_runs").select("status").eq("id", run.id).single();
      if (runState?.status === "cancelled") throw new Error("Workflow run cancelled");
      if (visited.has(nodeId)) continue;
      if (completed.has(nodeId)) { ctx.last = completed.get(nodeId); visited.add(nodeId); queue.push(...nextNodes(def, nodeId)); continue; }
      const node = byId.get(nodeId); if (!node) continue;
      visited.add(nodeId); steps++;
      await admin.from("workflow_runs").update({ current_node_id: node.id }).eq("id", run.id);
      const stepStart = Date.now();
      await admin.from("workflow_run_steps").insert({ run_id: run.id, workflow_id: workflowId, workspace_id: workspaceId, node_id: node.id, node_type: node.type, status: "running", input: ctx });
      try {
        let result: any = null;
        const config = interpolateObject(node.config, ctx) as Record<string, any>;
        switch (node.type) {
          case "trigger": result = input; break;
          case "transform": result = config.value ?? config; ctx.vars = { ...ctx.vars, ...(result && typeof result === "object" ? result : {}) }; break;
          case "ai": {
            const prompt = String(config.prompt || "");
            const response = await gatewayComplete({ system: String(config.system || "You are a workflow automation assistant."), messages: [{ role: "user", content: prompt }], mode: String(config.mode || "auto") });
            result = { text: response.text, provider: response.provider, model: response.model, usage: response.usage };
            break;
          }
          case "condition": {
            const left = config.left; const op = String(config.operator || "equals"); const right = config.right;
            const pass = op === "equals" ? String(left) === String(right) : op === "contains" ? String(left).includes(String(right)) : op === "not_equals" ? String(left) !== String(right) : Boolean(left);
            result = { pass };
            queue.push(...nextNodes(def, node.id, pass ? "true" : "false"));
            break;
          }
          case "knowledge": {
            const botId = String(config.botId || "");
            if (!botId) throw new Error("Knowledge node requires an agent (botId) to search.");
            const query = String(config.query || "");
            if (!query.trim()) throw new Error("Knowledge node requires a query.");
            const retrieval = await retrieveForQuery(botId, query);
            result = { contextBlock: retrieval.contextBlock, chunkCount: retrieval.chunks.length, useFallback: retrieval.useFallback };
            break;
          }
          case "tool": {
            const botId = String(config.botId || "");
            const toolKey = String(config.toolKey || "");
            if (!botId || !toolKey) throw new Error("Tool node requires an agent (botId) and a toolKey.");
            const toolInput = config.input && typeof config.input === "object" && !Array.isArray(config.input) ? config.input as Record<string, unknown> : {};
            result = await executeTool({ botId, toolKey, input: toolInput });
            break;
          }
          case "http": {
            const response = await fetch(String(config.url), { method: String(config.method || "POST"), headers: { "content-type": "application/json", ...(config.headers || {}) }, body: String(config.method || "POST") === "GET" ? undefined : JSON.stringify(config.body || ctx) , signal: AbortSignal.timeout(Number(config.timeoutMs || 10000)) });
            const text = await response.text(); result = { status: response.status, ok: response.ok, body: text.slice(0, 10000) }; if (!response.ok) throw new Error(`HTTP ${response.status}`); break;
          }
          case "email": await sendEmail({ to: String(config.to), subject: String(config.subject || "Chatbo workflow"), html: String(config.html || config.body || "") }); result = { sent: true, to: config.to }; break;
          case "webhook": {
            const response = await fetch(String(config.url), { method: "POST", headers: { "content-type": "application/json", ...(config.headers || {}) }, body: JSON.stringify(config.body || ctx), signal: AbortSignal.timeout(Number(config.timeoutMs || 10000)) });
            result = { status: response.status, ok: response.ok }; if (!response.ok) throw new Error(`Webhook ${response.status}`); break;
          }
          case "delay": { const ms = Math.max(0, Number(config.ms || 0)); if (runtime?.sleep) await runtime.sleep(`workflow-delay-${run.id}-${node.id}`, ms); else await new Promise((resolve) => setTimeout(resolve, Math.min(ms, 5000))); result = { delayedMs: ms }; break; }
          case "agent": {
            const targetBotId = String(config.targetBotId || "");
            if (!targetBotId) throw new Error("Agent node requires targetBotId");
            result = await delegateToAgent({ workspaceId, sourceBotId: String(config.sourceBotId || workflow.nodes.find((n: any) => n.type === "trigger")?.config?.botId || ""), targetBotId, task: String(config.task || config.prompt || "{{input.message}}"), context: { input, vars: ctx.vars, last: ctx.last } });
            break;
          }
          case "human_approval": {
            const expiresAt = new Date(Date.now() + Math.max(5, Number(config.expirationMinutes || 1440)) * 60_000).toISOString();
            const { data: approval } = await (admin as any).from("workflow_approvals").insert({
              workflow_id: workflowId, workflow_run_id: run.id, workspace_id: workspaceId, node_id: node.id,
              title: String(config.title || node.name || "Approval required"),
              description: String(config.description || "Review this AI-generated action before the workflow continues."),
              action_type: String(config.actionType || "workflow_action"), approver_role: String(config.approverRole || "admin"),
              payload: config.payload || ctx, expires_at: expiresAt
            }).select("id").single();
            if (!approval) throw new Error("Could not create approval request");
            const { data: members } = await admin.from("workspace_members").select("user_id,role").eq("workspace_id", workspaceId).not("joined_at", "is", null);
            const role = String(config.approverRole || "admin");
            const rank: Record<string, number> = { viewer: 0, editor: 1, admin: 2, owner: 3 };
            for (const member of members ?? []) {
              if ((rank[member.role] ?? 0) >= (rank[role] ?? 2)) {
                await admin.from("notifications").insert({ user_id: member.user_id, type: "workflow_approval", title: String(config.title || "Workflow approval required"), body: `An approval is waiting in ${workflowId}.` });
              }
            }
            result = { status: "pending_approval", approvalId: approval.id, expiresAt };
            await admin.from("workflow_runs").update({ status: "awaiting_approval", current_node_id: node.id }).eq("id", run.id);
            await admin.from("workflow_run_steps").update({ status: "succeeded", output: result, duration_ms: Date.now() - stepStart }).eq("run_id", run.id).eq("node_id", node.id).eq("status", "running");
            return { runId: run.id, status: "awaiting_approval", approvalId: approval.id, output: result };
          }
          case "end": result = config.output ?? ctx.last ?? null; output = result; break;
          default: result = null;
        }
        ctx.last = result;
        await admin.from("workflow_run_steps").update({ status: "succeeded", output: result, duration_ms: Date.now() - stepStart }).eq("run_id", run.id).eq("node_id", node.id).eq("status", "running");
        // node.type can't actually be "human_approval" here — that case
        // returns early above, before reaching this line — so TS correctly
        // flags the comparison as redundant rather than a bug.
        if (node.type !== "condition" && node.type !== "end") queue.push(...nextNodes(def, node.id));
        if (node.type === "end") queue = [];
      } catch (error) {
        const message = error instanceof Error ? error.message : "Workflow step failed";
        await admin.from("workflow_run_steps").update({ status: "failed", error: message, duration_ms: Date.now() - stepStart }).eq("run_id", run.id).eq("node_id", node.id).eq("status", "running");
        throw error;
      }
    }
    if (steps >= 50) throw new Error("Workflow exceeded the 50-step safety limit");
    await admin.from("workflow_runs").update({ status: "succeeded", output: output ?? ctx.last, completed_at: new Date().toISOString(), duration_ms: Date.now() - started, current_node_id: null }).eq("id", run.id);
    return { runId: run.id, status: "succeeded", output: output ?? ctx.last };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workflow failed";
    await admin.from("workflow_runs").update({ status: "failed", error: message, completed_at: new Date().toISOString(), duration_ms: Date.now() - started }).eq("id", run.id);
    throw new Error(message);
  }
}
