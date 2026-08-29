import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type TraceEventType = "run_started" | "retrieval" | "memory" | "model_call" | "tool_call" | "tool_result" | "guardrail" | "response" | "error" | "run_completed";

export async function startAgentRun(args: {
  workspaceId: string; botId: string; conversationId?: string | null; requestId: string; channel?: string;
}) {
  const { data, error } = await createAdminClient().from("agent_runs").insert({
    workspace_id: args.workspaceId, bot_id: args.botId, conversation_id: args.conversationId || null,
    request_id: args.requestId, channel: args.channel || null,
  }).select("id").single();
  if (error) throw error;
  await addTraceEvent({ runId: data.id, workspaceId: args.workspaceId, botId: args.botId, eventType: "run_started", name: "agent.run" });
  return data.id as string;
}

export async function addTraceEvent(args: {
  runId: string; workspaceId: string; botId: string; stepIndex?: number; eventType: TraceEventType;
  name?: string; status?: string; provider?: string; model?: string; durationMs?: number;
  inputTokens?: number; outputTokens?: number; costUsd?: number; payload?: Record<string, unknown>;
}) {
  const { error } = await createAdminClient().from("agent_trace_events").insert({
    run_id: args.runId, workspace_id: args.workspaceId, bot_id: args.botId,
    step_index: args.stepIndex || 0, event_type: args.eventType, name: args.name || null,
    status: args.status || null, provider: args.provider || null, model: args.model || null,
    duration_ms: args.durationMs ?? null, input_tokens: args.inputTokens ?? null,
    output_tokens: args.outputTokens ?? null, cost_usd: args.costUsd ?? null,
    payload: args.payload || {},
  });
  if (error) console.error("Trace event recording failed", error);
}

export async function finishAgentRun(args: {
  runId: string; workspaceId: string; botId: string; status: "succeeded" | "failed" | "cancelled";
  startedAt: number; totalSteps: number; toolCalls: number; modelCalls: number;
  inputTokens: number; outputTokens: number; cachedTokens: number; estimatedCostUsd: number;
  provider?: string; model?: string; qualityScore?: number; errorCode?: string; errorMessage?: string;
  usedFallback?: boolean;
}) {
  const durationMs = Date.now() - args.startedAt;
  await createAdminClient().from("agent_runs").update({
    status: args.status, completed_at: new Date().toISOString(), duration_ms: durationMs,
    total_steps: args.totalSteps, tool_calls: args.toolCalls, model_calls: args.modelCalls,
    input_tokens: args.inputTokens, output_tokens: args.outputTokens, cached_tokens: args.cachedTokens,
    estimated_cost_usd: args.estimatedCostUsd, provider: args.provider || null, model: args.model || null,
    quality_score: args.qualityScore ?? null, error_code: args.errorCode || null, error_message: args.errorMessage || null,
    used_fallback: args.usedFallback ?? false,
  }).eq("id", args.runId);
  await addTraceEvent({ runId: args.runId, workspaceId: args.workspaceId, botId: args.botId,
    stepIndex: args.totalSteps, eventType: "run_completed", name: "agent.run", status: args.status,
    durationMs, payload: { toolCalls: args.toolCalls, modelCalls: args.modelCalls },
  });
}
