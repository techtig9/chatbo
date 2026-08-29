import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GatewayProvider, GatewayUsage } from "./gateway";

export async function recordAIUsage(args: { workspaceId: string; botId: string; conversationId?: string; provider: GatewayProvider; model: string; usage: GatewayUsage; latencyMs: number; success?: boolean; errorMessage?: string; }) {
  const { error } = await createAdminClient().from("ai_usage_records").insert({ workspace_id: args.workspaceId, bot_id: args.botId, conversation_id: args.conversationId || null, provider: args.provider, model: args.model, input_tokens: args.usage.inputTokens, output_tokens: args.usage.outputTokens, cached_tokens: args.usage.cachedTokens, estimated_cost_usd: args.usage.estimatedCostUsd, latency_ms: args.latencyMs, success: args.success ?? true, error_message: args.errorMessage || null });
  if (error) console.error("AI usage recording failed", error);
}
