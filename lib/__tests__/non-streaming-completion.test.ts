import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// This test exists to guard against a real regression: the public API and
// channel-webhook chat path (runNonStreamingCompletion) used to call the
// Gemini SDK directly, bypassing the Groq -> Cerebras -> OpenRouter -> Claude
// gateway entirely. That meant the public API and every channel integration
// (Slack, WhatsApp, ...) got none of the failover, cost tracking or friendly
// error handling the rest of the app relies on. Everything below is mocked
// except @/lib/ai/gateway and @/lib/chat/mode, so a real gatewayComplete()
// call (with a stubbed fetch) is what actually produces the reply.

function chainableSupabaseTable() {
  const table: any = {
    insert: vi.fn(() => table),
    select: vi.fn(() => table),
    single: vi.fn(async () => ({ data: { id: "assistant-message-id" }, error: null })),
    then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }),
  };
  return table;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: vi.fn(() => chainableSupabaseTable()) }),
}));

vi.mock("@/lib/knowledge/retrieve", () => ({
  retrieveForQuery: vi.fn(async () => ({ chunks: [], contextBlock: "", useFallback: true })),
}));

vi.mock("@/lib/billing/spend", () => ({
  spendCreditsAtomic: vi.fn(async () => ({ success: true, newBalance: 42 })),
}));

vi.mock("@/lib/webhooks/trigger", () => ({
  triggerWebhookEvent: vi.fn(async () => {}),
}));

vi.mock("@/lib/cache/response-cache", () => ({
  getCachedResponse: vi.fn(async () => null),
  setCachedResponse: vi.fn(async () => {}),
}));

vi.mock("@/lib/ai/usage", () => ({
  recordAIUsage: vi.fn(async () => {}),
}));

const ENV_KEYS = ["GROQ_API_KEY", "CEREBRAS_API_KEY", "OPENROUTER_API_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY"] as const;
const originalEnv: Record<string, string | undefined> = {};

describe("runNonStreamingCompletion", () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }
    process.env.GROQ_API_KEY = "test-groq";
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("routes through the Groq/Cerebras/OpenRouter/Claude gateway, not a direct Gemini call", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("groq.com")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ choices: [{ message: { content: "hello from the gateway", tool_calls: [] } }], usage: { prompt_tokens: 12, completion_tokens: 4 } }),
          text: async () => "",
        } as Response;
      }
      throw new Error(`unexpected call to ${url} — this proves a non-gateway path was used`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { runNonStreamingCompletion } = await import("@/lib/chat/non-streaming-completion");
    const bot = {
      id: "bot-1",
      workspace_id: "ws-1",
      system_prompt: "You are a helpful assistant.",
      fallback_behavior: "say_dont_know",
      agent_config: {},
    } as any;

    const result = await runNonStreamingCompletion(bot, "conversation-1", "hi there", []);

    expect(result.reply).toBe("hello from the gateway");
    expect(result.provider).toBe("groq");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("groq.com");
  });

  it("throws the friendly gateway-unavailable error (not a raw provider message) when every provider fails", async () => {
    const fetchMock = vi.fn(async (url: string) => ({
      ok: false,
      status: 429,
      json: async () => ({ error: "Groq quota exceeded" }),
      text: async () => "Groq quota exceeded",
    } as Response));
    vi.stubGlobal("fetch", fetchMock);

    const { runNonStreamingCompletion } = await import("@/lib/chat/non-streaming-completion");
    const { GatewayExhaustedError, GATEWAY_UNAVAILABLE_MESSAGE } = await import("@/lib/ai/gateway");
    const bot = {
      id: "bot-1",
      workspace_id: "ws-1",
      system_prompt: "You are a helpful assistant.",
      fallback_behavior: "say_dont_know",
      agent_config: {},
    } as any;

    await expect(runNonStreamingCompletion(bot, "conversation-1", "hi there", []))
      .rejects.toMatchObject({ message: GATEWAY_UNAVAILABLE_MESSAGE });
    await expect(runNonStreamingCompletion(bot, "conversation-1", "hi there", []))
      .rejects.toBeInstanceOf(GatewayExhaustedError);
  });
});
