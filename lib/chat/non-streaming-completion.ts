import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { gatewayComplete, gatewayComplexity, type GatewayMessage } from "@/lib/ai/gateway";
import { recordAIUsage } from "@/lib/ai/usage";
import { retrieveForQuery } from "@/lib/knowledge/retrieve";
import { assembleChatRequest, type ChatHistoryTurn } from "@/lib/chat/assemble";
import { configMode } from "@/lib/chat/mode";
import { spendCreditsAtomic } from "@/lib/billing/spend";
import { triggerWebhookEvent } from "@/lib/webhooks/trigger";
import { buildResponseCacheKey } from "@/lib/cache/response-cache-key";
import { getCachedResponse, setCachedResponse } from "@/lib/cache/response-cache";
import type { BotRow } from "@/lib/data/bots";
import { enforceOutput, inspectUserInput } from "@/lib/security/guardrails";

export interface NonStreamingCompletionResult {
  reply: string;
  usedFallback: boolean;
  conversationId: string;
  creditsRemaining: number;
  provider: string;
  model: string;
}

export async function runNonStreamingCompletion(
  bot: BotRow,
  conversationId: string,
  userMessage: string,
  history: ChatHistoryTurn[]
): Promise<NonStreamingCompletionResult> {
  const supabase = createAdminClient();
  const guardrail = inspectUserInput(bot, userMessage);
  if (!guardrail.allowed) throw new Error(guardrail.message);

  const retrieval = await retrieveForQuery(bot.id, userMessage);
  const { system, messages } = assembleChatRequest(bot, retrieval, history, userMessage);
  const citations = retrieval.useFallback
    ? null
    : retrieval.chunks.map((c) => ({ sourceId: c.sourceId, sourceTitle: c.sourceTitle }));

  await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, role: "user", content: userMessage });

  const cacheKey = buildResponseCacheKey(bot.id, userMessage, retrieval.contextBlock);
  const cached = await getCachedResponse(cacheKey);

  let reply: string;
  let provider = "cache";
  let model = "cache";
  if (cached) {
    reply = enforceOutput(bot, cached.reply);
  } else {
    // Route through the central AI gateway (Groq -> Cerebras -> OpenRouter,
    // with optional Claude escalation for complex requests) instead of
    // calling a single provider directly, so this path gets the same
    // failover, cost tracking and logging as the streaming chat path.
    const gatewayMessages: GatewayMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));
    const complexity = gatewayComplexity(userMessage, 0, history.length);
    // GatewayExhaustedError already carries a friendly, user-safe message
    // and is logged internally by gatewayComplete — let it propagate so
    // callers (the public API route, channel webhooks) never see or
    // forward raw provider error text.
    const result = await gatewayComplete({ system, messages: gatewayMessages, mode: configMode(bot), complexity });

    reply = enforceOutput(bot, result.text);
    provider = result.provider;
    model = result.model;
    await recordAIUsage({ workspaceId: bot.workspace_id, botId: bot.id, conversationId, provider: result.provider, model: result.model, usage: result.usage, latencyMs: result.latencyMs });
    await setCachedResponse(cacheKey, { reply, usedFallback: retrieval.useFallback, citations });
  }

  const { data: insertedMessage } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role: "assistant",
      content: reply,
      citations,
    })
    .select("id")
    .single();

  const spendResult = await spendCreditsAtomic(bot.workspace_id, "apiRequest");

  if (insertedMessage) {
    await triggerWebhookEvent(bot.workspace_id, "message.created", {
      messageId: insertedMessage.id,
      conversationId,
      botId: bot.id,
      role: "assistant",
      usedFallback: retrieval.useFallback,
    });
  }

  return {
    reply,
    usedFallback: retrieval.useFallback,
    conversationId,
    creditsRemaining: spendResult.newBalance,
    provider,
    model,
  };
}
