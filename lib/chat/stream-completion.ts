import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { gatewayComplete, gatewayComplexity, type GatewayMessage, type GatewayTool } from "@/lib/ai/gateway";
import { recordAIUsage } from "@/lib/ai/usage";
import { retrieveForQuery } from "@/lib/knowledge/retrieve";
import { assembleChatRequest, type ChatHistoryTurn } from "./assemble";
import { spendCreditsAtomic } from "@/lib/billing/spend";
import { triggerWebhookEvent } from "@/lib/webhooks/trigger";
import { logFirstTokenLatency, generateRequestId } from "@/lib/observability/logger";
import { startAgentRun, addTraceEvent, finishAgentRun } from "@/lib/observability/tracing";
import type { BotRow } from "@/lib/data/bots";
import { getEnabledToolDefinitions } from "@/lib/tools/agent-tools";
import { executeTool } from "@/lib/tools/executor";
import { getMemoryContext } from "@/lib/memory/context";
import { rememberExplicitFacts, updateConversationSummary } from "@/lib/memory/service";
import { assertRunBudget, enforceOutput, inspectUserInput, getSecurityPolicy } from "@/lib/security/guardrails";
import { GatewayExhaustedError } from "@/lib/ai/gateway";
import { configMode } from "@/lib/chat/mode";

export interface StreamCompletionParams { bot: BotRow; conversationId: string; visitorId: string; userMessage: string; history: ChatHistoryTurn[]; persist: boolean; isPlatformAdmin: boolean; firesWebhooks: boolean; }
const MAX_TOOL_ROUNDS = 3;

function toolAdapters(definitions: Awaited<ReturnType<typeof getEnabledToolDefinitions>>): GatewayTool[] {
  return definitions.map((tool) => ({ name: tool.key, description: tool.description, inputSchema: tool.inputSchema }));
}

export function createChatStream(params: StreamCompletionParams): ReadableStream<Uint8Array> {
  const { bot, conversationId, visitorId, userMessage, history, persist, isPlatformAdmin, firesWebhooks } = params;
  const supabase = createAdminClient(); const encoder = new TextEncoder();
  return new ReadableStream({ async start(controller) {
    const streamStart = Date.now();
    const requestId = generateRequestId();
    let runId: string | null = null;
    let traceStep = 1;
    const sendEvent = (event: string, data: unknown) => controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    sendEvent("conversation", { conversationId, requestId });
    try {
      const inputGuardrail = inspectUserInput(bot, userMessage);
      if (!inputGuardrail.allowed) {
        await supabase.from("security_incidents").insert({workspace_id:bot.workspace_id,bot_id:bot.id,conversation_id:conversationId,request_id:requestId,code:inputGuardrail.code,severity:inputGuardrail.code === "PROMPT_INJECTION" ? "high" : "medium",message:inputGuardrail.message,metadata:{channel:firesWebhooks ? "widget" : "playground"}});
        sendEvent("error", { error: inputGuardrail.message, code: inputGuardrail.code, requestId });
        return;
      }
      const policy = getSecurityPolicy(bot);
      runId = await startAgentRun({ workspaceId: bot.workspace_id, botId: bot.id, conversationId, requestId, channel: firesWebhooks ? "widget" : "playground" });
      const retrievalStarted = Date.now();
      const retrieval = await retrieveForQuery(bot.id, userMessage);
      if (runId) await addTraceEvent({ runId, workspaceId: bot.workspace_id, botId: bot.id, stepIndex: traceStep++, eventType: "retrieval", name: "knowledge.retrieve", durationMs: Date.now() - retrievalStarted, status: "succeeded", payload: { chunks: retrieval.chunks.length, usedFallback: retrieval.useFallback } });
      const cfg = bot.agent_config && typeof bot.agent_config === "object" && !Array.isArray(bot.agent_config) ? bot.agent_config as Record<string, unknown> : {};
      const memoryMode = cfg.memory === "none" || cfg.memory === "persistent" ? cfg.memory : "conversation";
      const memoryStarted = Date.now();
      const memoryContext = await getMemoryContext(bot.id, visitorId, conversationId, memoryMode);
      if (runId) await addTraceEvent({ runId, workspaceId: bot.workspace_id, botId: bot.id, stepIndex: traceStep++, eventType: "memory", name: "memory.retrieve", durationMs: Date.now() - memoryStarted, status: "succeeded", payload: { mode: memoryMode } });
      const { system, messages } = assembleChatRequest(bot, retrieval, history, userMessage, memoryContext);
      if (persist) {
        await supabase.from("messages").insert({ conversation_id: conversationId, role: "user", content: userMessage });
        if (memoryMode === "persistent") await rememberExplicitFacts(bot.id, visitorId, conversationId, userMessage);
      }
      const citations = retrieval.useFallback ? null : retrieval.chunks.map(c => ({ sourceId: c.sourceId, sourceTitle: c.sourceTitle }));
      const enabledTools = await getEnabledToolDefinitions(bot.id);
      const tools = toolAdapters(enabledTools);
      let gatewayMessages: GatewayMessage[] = messages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
      let fullResponse = ""; let usedTools = false; let totalToolCalls = 0; let totalModelCalls = 0; let totalInput = 0; let totalOutput = 0; let totalCached = 0; let totalCost = 0; let provider = ""; let model = "";
      const complexity = gatewayComplexity(userMessage, tools.length, history.length);

      for (let round = 0; round < Math.min(MAX_TOOL_ROUNDS, policy.maxModelCalls); round++) {
        assertRunBudget(bot, streamStart, totalModelCalls, totalToolCalls, totalCost);
        const modelStarted = Date.now();
        const result = await gatewayComplete({ system, messages: gatewayMessages, tools, mode: configMode(bot), complexity: round === 0 ? complexity : "normal" });
        if (runId) await addTraceEvent({ runId, workspaceId: bot.workspace_id, botId: bot.id, stepIndex: traceStep++, eventType: "model_call", name: "ai.generate", durationMs: result.latencyMs || (Date.now() - modelStarted), provider: result.provider, model: result.model, inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens, costUsd: result.usage.estimatedCostUsd, status: "succeeded", payload: { round, complexity, toolCalls: result.toolCalls.length } });
        provider = result.provider; model = result.model; totalModelCalls++; totalToolCalls += result.toolCalls.length;
        totalInput += result.usage.inputTokens; totalOutput += result.usage.outputTokens; totalCached += result.usage.cachedTokens; totalCost += result.usage.estimatedCostUsd;
        if (persist) await recordAIUsage({ workspaceId: bot.workspace_id, botId: bot.id, conversationId, provider: result.provider, model: result.model, usage: result.usage, latencyMs: result.latencyMs });
        if (!result.toolCalls.length) { fullResponse = result.text; break; }
        usedTools = true;
        gatewayMessages.push({ role: "assistant", content: result.text, toolCalls: result.toolCalls });
        for (const call of result.toolCalls) {
          assertRunBudget(bot, streamStart, totalModelCalls, totalToolCalls, totalCost);
          sendEvent("tool_call", { tool: call.name, status: "started", provider: result.provider });
          try {
            const toolStarted = Date.now();
            if (runId) await addTraceEvent({ runId, workspaceId: bot.workspace_id, botId: bot.id, stepIndex: traceStep++, eventType: "tool_call", name: call.name, status: "started", provider: result.provider, model: result.model, payload: { arguments: call.args } });
            const output = await executeTool({ botId: bot.id, conversationId, toolKey: call.name, input: call.args });
            if (runId) await addTraceEvent({ runId, workspaceId: bot.workspace_id, botId: bot.id, stepIndex: traceStep++, eventType: "tool_result", name: call.name, durationMs: Date.now() - toolStarted, status: "succeeded", payload: { output } });
            gatewayMessages.push({ role: "tool", content: JSON.stringify(output), toolCallId: call.id, toolName: call.name });
            sendEvent("tool_call", { tool: call.name, status: "succeeded" });
          } catch (error) {
            const message = error instanceof Error ? error.message : "Tool execution failed";
            if (runId) await addTraceEvent({ runId, workspaceId: bot.workspace_id, botId: bot.id, stepIndex: traceStep++, eventType: "tool_result", name: call.name, status: "failed", payload: { error: message } });
            gatewayMessages.push({ role: "tool", content: JSON.stringify({ ok: false, error: message }), toolCallId: call.id, toolName: call.name });
            sendEvent("tool_call", { tool: call.name, status: "failed", error: message });
          }
        }
      }

      if (!fullResponse) {
        fullResponse = "I couldn't complete that request right now. Please try again.";
      }
      fullResponse = enforceOutput(bot, fullResponse);
      sendEvent("token", { text: fullResponse });
      logFirstTokenLatency({ botId: bot.id, channel: firesWebhooks ? "widget" : "playground", latencyMs: Date.now() - streamStart, cacheHit: totalCached > 0 });

      let creditsRemaining: number | null = null; let assistantMessageId: string | null = null;
      if (persist) {
        const { data: inserted } = await supabase.from("messages").insert({ conversation_id: conversationId, role: "assistant", content: fullResponse, citations }).select("id").single(); assistantMessageId = inserted?.id ?? null;
        if (isPlatformAdmin) { const { data: sub } = await supabase.from("subscriptions").select("credits_remaining").eq("workspace_id", bot.workspace_id).maybeSingle(); creditsRemaining = sub?.credits_remaining ?? null; } else { const spend = await spendCreditsAtomic(bot.workspace_id, "messageExchange"); creditsRemaining = spend.newBalance; }
        if (assistantMessageId && firesWebhooks) await triggerWebhookEvent(bot.workspace_id, "message.created", { messageId: assistantMessageId, conversationId, botId: bot.id, role: "assistant", usedFallback: retrieval.useFallback, usedTools });
      }
      if (persist && memoryMode !== "none") {
        const { data: summaryMessages } = await supabase.from("messages").select("role, content").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(60);
        if (summaryMessages) await updateConversationSummary(conversationId, bot.id, summaryMessages);
      }
      sendEvent("gateway", { provider, model, complexity, inputTokens: totalInput, outputTokens: totalOutput, cachedTokens: totalCached, estimatedCostUsd: totalCost });
      if (runId) await addTraceEvent({ runId, workspaceId: bot.workspace_id, botId: bot.id, stepIndex: traceStep++, eventType: "response", name: "agent.response", status: "succeeded", payload: { characters: fullResponse.length } });
      if (runId) await finishAgentRun({ runId, workspaceId: bot.workspace_id, botId: bot.id, status: "succeeded", startedAt: streamStart, totalSteps: traceStep - 1, toolCalls: totalToolCalls, modelCalls: totalModelCalls, inputTokens: totalInput, outputTokens: totalOutput, cachedTokens: totalCached, estimatedCostUsd: totalCost, provider, model, usedFallback: retrieval.useFallback });
      sendEvent("done", { usedFallback: retrieval.useFallback, creditsRemaining, messageId: assistantMessageId, usedTools, provider, model, requestId, citations });
    } catch (err) {
      // Never leak raw provider errors (e.g. "Groq 429") to the client.
      // GatewayExhaustedError already carries a friendly `message`; log the
      // technical detail server-side and record it against the run.
      const isGatewayExhausted = err instanceof GatewayExhaustedError;
      const technicalMessage = err instanceof Error ? err.message : "Generation failed";
      if (isGatewayExhausted) console.error("[chat-stream] AI gateway exhausted", { requestId, detail: (err as InstanceType<typeof GatewayExhaustedError>).technicalDetail });
      const clientMessage = isGatewayExhausted ? technicalMessage : (err instanceof Error ? "Something went wrong generating a response. Please try again." : "Generation failed");
      if (runId) await finishAgentRun({ runId, workspaceId: bot.workspace_id, botId: bot.id, status: "failed", startedAt: streamStart, totalSteps: traceStep - 1, toolCalls: 0, modelCalls: 0, inputTokens: 0, outputTokens: 0, cachedTokens: 0, estimatedCostUsd: 0, errorMessage: technicalMessage });
      sendEvent("error", { error: clientMessage, requestId });
    } finally { controller.close(); }
  }});
}
