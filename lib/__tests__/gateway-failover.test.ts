import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gatewayComplete, GatewayExhaustedError, GATEWAY_UNAVAILABLE_MESSAGE } from "@/lib/ai/gateway";

const ENV_KEYS = ["GROQ_API_KEY", "CEREBRAS_API_KEY", "OPENROUTER_API_KEY", "ANTHROPIC_API_KEY"] as const;
const originalEnv: Record<string, string | undefined> = {};

function fakeResponse(ok: boolean, status: number, json: unknown) {
  return {
    ok,
    status,
    json: async () => json,
    text: async () => JSON.stringify(json),
  } as Response;
}

function openAIChoice(text: string) {
  return { choices: [{ message: { content: text, tool_calls: [] } }], usage: { prompt_tokens: 10, completion_tokens: 5 } };
}

function anthropicChoice(text: string) {
  return { content: [{ type: "text", text }], usage: { input_tokens: 10, output_tokens: 5 } };
}

const RATE_LIMIT = { error: { message: "rate limit exceeded" } };

describe("AI gateway provider failover", () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
    vi.unstubAllGlobals();
  });

  it("1. uses Groq when it succeeds", async () => {
    process.env.GROQ_API_KEY = "test-groq";
    process.env.CEREBRAS_API_KEY = "test-cerebras";
    process.env.OPENROUTER_API_KEY = "test-openrouter";
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("groq.com")) return fakeResponse(true, 200, openAIChoice("hello from groq"));
      throw new Error(`unexpected call to ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await gatewayComplete({ system: "sys", messages: [{ role: "user", content: "hi" }], complexity: "normal" });

    expect(result.provider).toBe("groq");
    expect(result.text).toBe("hello from groq");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("2. falls over to Cerebras when Groq hits a quota/429 error", async () => {
    process.env.GROQ_API_KEY = "test-groq";
    process.env.CEREBRAS_API_KEY = "test-cerebras";
    process.env.OPENROUTER_API_KEY = "test-openrouter";
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("groq.com")) return fakeResponse(false, 429, RATE_LIMIT);
      if (url.includes("cerebras.ai")) return fakeResponse(true, 200, openAIChoice("hello from cerebras"));
      throw new Error(`unexpected call to ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await gatewayComplete({ system: "sys", messages: [{ role: "user", content: "hi" }], complexity: "normal" });

    expect(result.provider).toBe("cerebras");
    expect(result.text).toBe("hello from cerebras");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("3. falls over to OpenRouter when Groq and Cerebras both fail", async () => {
    process.env.GROQ_API_KEY = "test-groq";
    process.env.CEREBRAS_API_KEY = "test-cerebras";
    process.env.OPENROUTER_API_KEY = "test-openrouter";
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("groq.com")) return fakeResponse(false, 429, RATE_LIMIT);
      if (url.includes("cerebras.ai")) return fakeResponse(false, 503, { error: "capacity" });
      if (url.includes("openrouter.ai")) return fakeResponse(true, 200, openAIChoice("hello from openrouter"));
      throw new Error(`unexpected call to ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await gatewayComplete({ system: "sys", messages: [{ role: "user", content: "hi" }], complexity: "normal" });

    expect(result.provider).toBe("openrouter");
    expect(result.text).toBe("hello from openrouter");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("4. escalates to Claude only for a complex task once Groq, Cerebras and OpenRouter fail", async () => {
    process.env.GROQ_API_KEY = "test-groq";
    process.env.CEREBRAS_API_KEY = "test-cerebras";
    process.env.OPENROUTER_API_KEY = "test-openrouter";
    process.env.ANTHROPIC_API_KEY = "test-anthropic";
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("groq.com")) return fakeResponse(false, 429, RATE_LIMIT);
      if (url.includes("cerebras.ai")) return fakeResponse(false, 429, RATE_LIMIT);
      if (url.includes("openrouter.ai")) return fakeResponse(false, 500, { error: "server error" });
      if (url.includes("anthropic.com")) return fakeResponse(true, 200, anthropicChoice("hello from claude"));
      throw new Error(`unexpected call to ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await gatewayComplete({ system: "sys", messages: [{ role: "user", content: "please debug and analyze this step-by-step" }], complexity: "complex" });

    expect(result.provider).toBe("anthropic");
    expect(result.text).toBe("hello from claude");
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("a simple/normal task never escalates to Claude, even if Claude is configured", async () => {
    process.env.GROQ_API_KEY = "test-groq";
    process.env.CEREBRAS_API_KEY = "test-cerebras";
    process.env.OPENROUTER_API_KEY = "test-openrouter";
    process.env.ANTHROPIC_API_KEY = "test-anthropic";
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("groq.com")) return fakeResponse(false, 429, RATE_LIMIT);
      if (url.includes("cerebras.ai")) return fakeResponse(false, 429, RATE_LIMIT);
      if (url.includes("openrouter.ai")) return fakeResponse(false, 429, RATE_LIMIT);
      throw new Error(`unexpected call to ${url} — Claude should not be reached for normal complexity`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(gatewayComplete({ system: "sys", messages: [{ role: "user", content: "hi" }], complexity: "normal" }))
      .rejects.toBeInstanceOf(GatewayExhaustedError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("5. returns a friendly, non-leaking error once every provider fails (Claude unavailable)", async () => {
    process.env.GROQ_API_KEY = "test-groq";
    process.env.CEREBRAS_API_KEY = "test-cerebras";
    process.env.OPENROUTER_API_KEY = "test-openrouter";
    // ANTHROPIC_API_KEY intentionally left unset — Claude is optional.
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("groq.com")) return fakeResponse(false, 429, { error: { message: "Groq quota exceeded, secret-key abc123" } });
      if (url.includes("cerebras.ai")) return fakeResponse(false, 503, { error: "Cerebras capacity unavailable" });
      if (url.includes("openrouter.ai")) return fakeResponse(false, 500, { error: "OpenRouter internal error" });
      throw new Error(`unexpected call to ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const promise = gatewayComplete({ system: "sys", messages: [{ role: "user", content: "please debug and analyze this" }], complexity: "complex" });
    await expect(promise).rejects.toBeInstanceOf(GatewayExhaustedError);
    await expect(promise).rejects.toMatchObject({ message: GATEWAY_UNAVAILABLE_MESSAGE });

    // The friendly message must never contain provider-identifying detail;
    // that detail belongs only on technicalDetail, for server-side logging.
    try {
      await gatewayComplete({ system: "sys", messages: [{ role: "user", content: "please debug and analyze this" }], complexity: "complex" });
      throw new Error("expected gatewayComplete to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(GatewayExhaustedError);
      const gatewayError = error as GatewayExhaustedError;
      expect(gatewayError.message).toBe(GATEWAY_UNAVAILABLE_MESSAGE);
      expect(gatewayError.message).not.toMatch(/groq|cerebras|openrouter|429|secret-key/i);
      expect(gatewayError.technicalDetail).toMatch(/groq/i);
    }
  });

  it("throws a friendly error when no provider is configured at all", async () => {
    const fetchMock = vi.fn(async (url: string) => { throw new Error(`unexpected call to ${url}`); });
    vi.stubGlobal("fetch", fetchMock);

    await expect(gatewayComplete({ system: "sys", messages: [{ role: "user", content: "hi" }], complexity: "normal" }))
      .rejects.toBeInstanceOf(GatewayExhaustedError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
