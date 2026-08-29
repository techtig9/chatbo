import "server-only";
import { getGeminiClient, CHAT_MODEL } from "./gemini";
import { providerChain, type RoutingComplexity } from "./provider-routing";
import { getDisabledProviders, recordProviderHealth } from "./provider-health";

export type GatewayProvider = "gemini" | "groq" | "cerebras" | "openrouter" | "anthropic";
export type GatewayMode = "auto" | "fast" | "balanced" | "advanced";
export type GatewayMessage = { role: "system" | "user" | "assistant" | "tool"; content: string; toolCallId?: string; toolName?: string; toolCalls?: GatewayToolCall[] };
export type GatewayTool = { name: string; description: string; inputSchema: Record<string, unknown> };
export type GatewayToolCall = { id: string; name: string; args: Record<string, unknown> };
export type GatewayUsage = { inputTokens: number; outputTokens: number; cachedTokens: number; estimatedCostUsd: number };
export type GatewayResult = { text: string; toolCalls: GatewayToolCall[]; usage: GatewayUsage; provider: GatewayProvider; model: string; latencyMs: number };

/**
 * Shown to end users whenever the entire provider chain is exhausted.
 * Never surface raw provider errors (e.g. "Groq 429", "Cerebras quota
 * exceeded") to a client — log the technical detail internally instead
 * (see GatewayExhaustedError.technicalDetail) and show this message.
 */
export const GATEWAY_UNAVAILABLE_MESSAGE = "Our AI services are temporarily unavailable. Please try again in a moment.";

/**
 * Thrown by gatewayComplete when every configured provider in the chain
 * failed (or none are configured). `message` is always the friendly,
 * user-safe GATEWAY_UNAVAILABLE_MESSAGE; the raw per-provider failure
 * reasons are on `technicalDetail` for server-side logging only.
 */
export class GatewayExhaustedError extends Error {
  readonly technicalDetail: string;
  constructor(technicalDetail: string) {
    super(GATEWAY_UNAVAILABLE_MESSAGE);
    this.name = "GatewayExhaustedError";
    this.technicalDetail = technicalDetail;
  }
}

const OPENAI_COMPATIBLE: Record<Exclude<GatewayProvider, "gemini" | "anthropic">, { env: string; baseUrl: string; modelEnv: string; defaultModel: string }> = {
  groq: { env: "GROQ_API_KEY", baseUrl: "https://api.groq.com/openai/v1/chat/completions", modelEnv: "GROQ_MODEL", defaultModel: "llama-3.3-70b-versatile" },
  cerebras: { env: "CEREBRAS_API_KEY", baseUrl: "https://api.cerebras.ai/v1/chat/completions", modelEnv: "CEREBRAS_MODEL", defaultModel: "llama-3.3-70b" },
  openrouter: { env: "OPENROUTER_API_KEY", baseUrl: "https://openrouter.ai/api/v1/chat/completions", modelEnv: "OPENROUTER_MODEL", defaultModel: "openai/gpt-4.1-mini" },
};

const DEFAULT_MODELS = {
  gemini: CHAT_MODEL,
  groq: "llama-3.3-70b-versatile",
  cerebras: "llama-3.3-70b",
  openrouter: "openai/gpt-4.1-mini",
  anthropic: "claude-sonnet-4-5",
};

export function configured(provider: GatewayProvider) {
  if (provider === "gemini") return Boolean(process.env.GEMINI_API_KEY);
  if (provider === "anthropic") return Boolean(process.env.ANTHROPIC_API_KEY);
  return Boolean(process.env[OPENAI_COMPATIBLE[provider].env]);
}

export function modelFor(provider: GatewayProvider) {
  if (provider === "gemini") return process.env.GEMINI_CHAT_MODEL || DEFAULT_MODELS.gemini;
  if (provider === "anthropic") return process.env.ANTHROPIC_MODEL || DEFAULT_MODELS.anthropic;
  const c = OPENAI_COMPATIBLE[provider];
  return process.env[c.modelEnv] || c.defaultModel;
}

function configuredProviders(): GatewayProvider[] {
  // Automatic production chain: Groq -> Cerebras -> OpenRouter.
  // Claude/Anthropic is appended only for tasks classified as complex.
  // Gemini remains supported as an explicit/legacy provider but is not part
  // of the automatic chain, so it cannot consume usage unexpectedly.
  return (["groq", "cerebras", "openrouter", "anthropic"] as GatewayProvider[]).filter(configured);
}

function automaticProviderChain(complexity: RoutingComplexity): GatewayProvider[] {
  const available = configuredProviders();
  return providerChain(complexity).filter((provider) => available.includes(provider));
}

function modeProviderChain(_mode: GatewayMode, complexity: "simple" | "normal" | "complex"): GatewayProvider[] {
  return automaticProviderChain(complexity);
}

export function resolveGatewayRoute(mode: string | undefined, complexity: "simple" | "normal" | "complex" = "normal") {
  const normalized: GatewayMode = mode === "fast" || mode === "balanced" || mode === "advanced" ? mode : "auto";
  const candidates = modeProviderChain(normalized, complexity);
  const provider = candidates[0];
  if (!provider) throw new Error("No AI provider is configured. Add GROQ_API_KEY, CEREBRAS_API_KEY, OPENROUTER_API_KEY, or ANTHROPIC_API_KEY.");
  return { provider, model: modelFor(provider), mode: normalized, candidates };
}

function complexityFor(input: string, toolCount: number, historyLength: number): "simple" | "normal" | "complex" {
  const long = input.length > 1800 || historyLength > 20;
  const reasoning = /\b(analy[sz]e|compare|plan|strategy|debug|research|design|calculate|step[- ]by[- ]step|complex)\b/i.test(input);
  return reasoning || (long && toolCount > 1) ? "complex" : toolCount === 0 && input.length < 280 ? "simple" : "normal";
}

function estimateCost(provider: GatewayProvider, inputTokens: number, outputTokens: number, cachedTokens = 0) {
  const key = provider.toUpperCase();
  const input = Number(process.env[`AI_COST_${key}_INPUT_PER_1M`] || 0);
  const output = Number(process.env[`AI_COST_${key}_OUTPUT_PER_1M`] || 0);
  const cached = Number(process.env[`AI_COST_${key}_CACHED_PER_1M`] || 0);
  return Math.max(0, ((Math.max(0, inputTokens - cachedTokens) / 1_000_000) * input) + ((cachedTokens / 1_000_000) * cached) + ((outputTokens / 1_000_000) * output));
}

function openAITools(tools: GatewayTool[]) {
  return tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.inputSchema } }));
}

function openAIMessages(messages: GatewayMessage[]) {
  return messages.map((m) => {
    if (m.role === "tool") return { role: "tool", tool_call_id: m.toolCallId, content: m.content };
    if (m.role === "assistant" && m.toolCalls?.length) return { role: "assistant", content: m.content || null, tool_calls: m.toolCalls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: JSON.stringify(c.args) } })) };
    return { role: m.role, content: m.content };
  });
}

async function openAICompatible(provider: Exclude<GatewayProvider, "gemini" | "anthropic">, system: string, messages: GatewayMessage[], tools: GatewayTool[]) {
  const cfg = OPENAI_COMPATIBLE[provider];
  const key = process.env[cfg.env];
  if (!key) throw new Error(`${provider} is not configured`);
  const response = await fetch(cfg.baseUrl, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}`, ...(provider === "openrouter" ? { "HTTP-Referer": process.env.APP_URL || "http://localhost:3000", "X-Title": "chatbo.ai" } : {}) }, body: JSON.stringify({ model: modelFor(provider), messages: [{ role: "system", content: system }, ...openAIMessages(messages)], tools: tools.length ? openAITools(tools) : undefined, tool_choice: tools.length ? "auto" : undefined, temperature: 0.2, max_tokens: 1200 }) });
  if (!response.ok) throw new Error(`${provider} returned ${response.status}: ${(await response.text()).slice(0, 500)}`);
  const json = await response.json();
  const choice = json.choices?.[0];
  const toolCalls: GatewayToolCall[] = (choice?.message?.tool_calls || []).map((call: any) => ({ id: String(call.id), name: String(call.function?.name), args: typeof call.function?.arguments === "string" ? JSON.parse(call.function.arguments || "{}") : (call.function?.arguments || {}) }));
  const usage = json.usage || {};
  return { text: String(choice?.message?.content || ""), toolCalls, inputTokens: Number(usage.prompt_tokens || 0), outputTokens: Number(usage.completion_tokens || 0), cachedTokens: Number(usage.prompt_tokens_details?.cached_tokens || 0) };
}

async function anthropic(system: string, messages: GatewayMessage[], tools: GatewayTool[]) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("anthropic is not configured");
  const body = { model: modelFor("anthropic"), max_tokens: 1200, system, messages: messages.filter((m) => m.role !== "system").map((m) => m.role === "tool" ? { role: "user", content: [{ type: "tool_result", tool_use_id: m.toolCallId, content: m.content }] } : m.role === "assistant" && m.toolCalls?.length ? { role: "assistant", content: [{ type: "text", text: m.content || "" }, ...m.toolCalls.map((c) => ({ type: "tool_use", id: c.id, name: c.name, input: c.args }))] } : { role: m.role, content: m.content }), tools: tools.length ? tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema })) : undefined };
  const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`anthropic returned ${response.status}: ${(await response.text()).slice(0, 500)}`);
  const json = await response.json();
  const toolCalls: GatewayToolCall[] = (json.content || []).filter((x: any) => x.type === "tool_use").map((x: any) => ({ id: String(x.id), name: String(x.name), args: x.input || {} }));
  const text = (json.content || []).filter((x: any) => x.type === "text").map((x: any) => x.text).join("");
  return { text, toolCalls, inputTokens: Number(json.usage?.input_tokens || 0), outputTokens: Number(json.usage?.output_tokens || 0), cachedTokens: Number(json.usage?.cache_read_input_tokens || 0) };
}

export async function gatewayComplete(args: { system: string; messages: GatewayMessage[]; tools?: GatewayTool[]; mode?: string; complexity?: "simple" | "normal" | "complex"; forcedProvider?: GatewayProvider }) : Promise<GatewayResult> {
  const complexity = args.complexity || complexityFor(args.messages.at(-1)?.content || "", args.tools?.length || 0, args.messages.length);
  const baseCandidates: GatewayProvider[] = args.forcedProvider
    ? [args.forcedProvider]
    : modeProviderChain(args.mode === "fast" || args.mode === "balanced" || args.mode === "advanced" ? args.mode : "auto", complexity);
  // Circuit breaker: skip providers that have failed repeatedly and are
  // in their cooldown window, instead of spending a request finding out
  // what ai_provider_health already knows. Never forced-provider calls —
  // an explicit forcedProvider request means "use exactly this one."
  const disabled = args.forcedProvider ? new Set<GatewayProvider>() : await getDisabledProviders();
  const candidates = baseCandidates.filter((p) => !disabled.has(p));
  const started = Date.now();
  let last: unknown;
  const failures: string[] = [];

  for (const provider of candidates) {
    if (!configured(provider)) continue;
    try {
      const raw = provider === "anthropic"
        ? await anthropic(args.system, args.messages, args.tools || [])
        : provider === "gemini"
          ? await geminiComplete(args.system, args.messages, args.tools || [])
          : await openAICompatible(provider, args.system, args.messages, args.tools || []);
      const usage = { inputTokens: raw.inputTokens, outputTokens: raw.outputTokens, cachedTokens: raw.cachedTokens, estimatedCostUsd: estimateCost(provider, raw.inputTokens, raw.outputTokens, raw.cachedTokens) };
      // Fire-and-forget — this is a 2-round-trip DB write purely for the
      // AI Gateway dashboard's health display; it must never add latency
      // to the chat response the person is actually waiting on.
      void recordProviderHealth(provider, true);
      return { text: raw.text, toolCalls: raw.toolCalls, usage, provider, model: modelFor(provider), latencyMs: Date.now() - started };
    } catch (error) {
      last = error;
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${provider}: ${message.slice(0, 180)}`);
      void recordProviderHealth(provider, false);
      // A quota/rate-limit response (normally HTTP 429) and transient provider
      // errors both fail over automatically to the next provider.
    }
  }

  const detail = failures.length ? failures.join(" | ") : "No AI provider is configured (GROQ_API_KEY, CEREBRAS_API_KEY, OPENROUTER_API_KEY, ANTHROPIC_API_KEY are all unset).";
  // Technical provider detail is logged server-side only; callers must
  // catch GatewayExhaustedError and show its (friendly) `message` to users,
  // never `technicalDetail`.
  console.error("[ai-gateway] provider chain exhausted", { failures, candidates });
  void last;
  throw new GatewayExhaustedError(detail);
}

async function geminiComplete(system: string, messages: GatewayMessage[], tools: GatewayTool[]) {
  const client = getGeminiClient();
  const contents = messages.map((m) => {
    if (m.role === "tool") return { role: "user" as const, parts: [{ text: `Tool ${m.toolName || "result"} result: ${m.content}` }] };
    if (m.role === "assistant" && m.toolCalls?.length) return { role: "model" as const, parts: [...(m.content ? [{ text: m.content }] : []), ...m.toolCalls.map((c) => ({ functionCall: { name: c.name, args: c.args, id: c.id } }))] };
    return { role: m.role === "assistant" ? "model" as const : "user" as const, parts: [{ text: m.content }] };
  });
  const response: any = await client.models.generateContent({ model: modelFor("gemini"), contents, config: { systemInstruction: system, maxOutputTokens: 1200, ...(tools.length ? { tools: [{ functionDeclarations: tools.map((t) => ({ name: t.name, description: t.description, parameters: t.inputSchema })) }] } : {}) } });
  const parts = response?.candidates?.[0]?.content?.parts || [];
  return { text: parts.filter((p: any) => p.text).map((p: any) => p.text).join(""), toolCalls: parts.filter((p: any) => p.functionCall).map((p: any, i: number) => ({ id: String(p.functionCall.id || `gemini-call-${Date.now()}-${i}`), name: String(p.functionCall.name), args: p.functionCall.args || {} })), inputTokens: Number(response?.usageMetadata?.promptTokenCount || 0), outputTokens: Number(response?.usageMetadata?.candidatesTokenCount || 0), cachedTokens: Number(response?.usageMetadata?.cachedContentTokenCount || 0) };
}

export function gatewayComplexity(input: string, toolCount: number, historyLength: number) { return complexityFor(input, toolCount, historyLength); }
