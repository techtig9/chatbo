import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = ["GROQ_API_KEY", "CEREBRAS_API_KEY", "OPENROUTER_API_KEY", "ANTHROPIC_API_KEY"] as const;
const originalEnv: Record<string, string | undefined> = {};

function fakeResponse(ok: boolean, status: number, json: unknown) {
  return { ok, status, json: async () => json, text: async () => JSON.stringify(json) } as Response;
}
function openAIChoice(text: string) {
  return { choices: [{ message: { content: text, tool_calls: [] } }], usage: { prompt_tokens: 10, completion_tokens: 5 } };
}

// getDisabledProviders hits Supabase — mocked here so the test can prove
// gatewayComplete actually SKIPS a disabled provider (never calls fetch
// for it at all), not just that the health state machine computes the
// right disabledUntil value in isolation (that's provider-health.test.ts).
vi.mock("@/lib/ai/provider-health", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/provider-health")>();
  return { ...actual, getDisabledProviders: vi.fn(), recordProviderHealth: vi.fn(async () => {}) };
});

describe("gatewayComplete respects the provider-health circuit breaker", () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) { originalEnv[key] = process.env[key]; delete process.env[key]; }
  });
  afterEach(() => {
    for (const key of ENV_KEYS) { if (originalEnv[key] === undefined) delete process.env[key]; else process.env[key] = originalEnv[key]; }
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("skips a currently-disabled provider entirely — no fetch call made to it — and goes straight to the next one", async () => {
    process.env.GROQ_API_KEY = "test-groq";
    process.env.CEREBRAS_API_KEY = "test-cerebras";
    const { getDisabledProviders } = await import("@/lib/ai/provider-health");
    vi.mocked(getDisabledProviders).mockResolvedValue(new Set(["groq"]));

    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("groq.com")) throw new Error("groq should never be called while disabled");
      if (url.includes("cerebras.ai")) return fakeResponse(true, 200, openAIChoice("hello from cerebras"));
      throw new Error(`unexpected call to ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { gatewayComplete } = await import("@/lib/ai/gateway");
    const result = await gatewayComplete({ system: "sys", messages: [{ role: "user", content: "hi" }], complexity: "normal" });

    expect(result.provider).toBe("cerebras");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("cerebras.ai");
  });

  it("a forcedProvider call bypasses the circuit breaker — an explicit request for one provider is used even if it's in cooldown", async () => {
    process.env.GROQ_API_KEY = "test-groq";
    const { getDisabledProviders } = await import("@/lib/ai/provider-health");
    vi.mocked(getDisabledProviders).mockResolvedValue(new Set(["groq"]));

    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("groq.com")) return fakeResponse(true, 200, openAIChoice("forced through anyway"));
      throw new Error(`unexpected call to ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { gatewayComplete } = await import("@/lib/ai/gateway");
    const result = await gatewayComplete({ system: "sys", messages: [{ role: "user", content: "hi" }], complexity: "normal", forcedProvider: "groq" });

    expect(result.provider).toBe("groq");
    expect(getDisabledProviders).not.toHaveBeenCalled();
  });

  it("when nothing is disabled, every configured provider stays eligible as normal", async () => {
    process.env.GROQ_API_KEY = "test-groq";
    const { getDisabledProviders } = await import("@/lib/ai/provider-health");
    vi.mocked(getDisabledProviders).mockResolvedValue(new Set());

    const fetchMock = vi.fn(async () => fakeResponse(true, 200, openAIChoice("hello from groq")));
    vi.stubGlobal("fetch", fetchMock);

    const { gatewayComplete } = await import("@/lib/ai/gateway");
    const result = await gatewayComplete({ system: "sys", messages: [{ role: "user", content: "hi" }], complexity: "normal" });
    expect(result.provider).toBe("groq");
  });
});
