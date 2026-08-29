import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Builds a chainable Supabase query-builder stub. Every non-terminal call
// (select/eq/is/order/limit/insert/update) returns the same builder so
// arbitrarily long chains work; `.single()`/`.maybeSingle()` resolve to the
// given value, and the builder is also directly thenable so a bare
// `await supabase.from(x)...` (no terminal call) resolves too.
function makeQueryBuilder(resolved: { data: unknown; error: unknown }) {
  const builder: any = {};
  for (const method of ["select", "eq", "is", "order", "limit", "update", "insert"]) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(async () => resolved);
  builder.single = vi.fn(async () => resolved);
  builder.then = (resolve: (v: unknown) => void) => Promise.resolve(resolved).then(resolve);
  return builder;
}

/**
 * `responses` maps a table name to a queue of results — each successive
 * `.from(table)` call for that table pops the next one off the queue, so a
 * table queried more than once (e.g. channel_events: dedupe-select, then
 * insert, then final update) can return different canned data each time.
 */
function makeSupabaseMock(responses: Record<string, { data: unknown; error: unknown }[]>) {
  return {
    from: vi.fn((table: string) => {
      const queue = responses[table];
      const next = queue?.shift() ?? { data: null, error: null };
      return makeQueryBuilder(next);
    }),
  };
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => currentSupabaseMock,
}));

const runNonStreamingCompletionMock = vi.fn(async () => ({
  reply: "AI-generated reply",
  usedFallback: false,
  conversationId: "conv-1",
  creditsRemaining: 90,
  provider: "groq",
  model: "llama-3.3-70b-versatile",
}));
vi.mock("@/lib/chat/non-streaming-completion", () => ({
  runNonStreamingCompletion: (...args: unknown[]) => (runNonStreamingCompletionMock as any)(...args),
}));

let currentSupabaseMock: ReturnType<typeof makeSupabaseMock>;

const bot = { id: "bot-1", workspace_id: "ws-1" } as any;

describe("processInboundChannelMessage — credit enforcement", () => {
  beforeEach(() => {
    runNonStreamingCompletionMock.mockClear();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("does not call the AI gateway when the workspace has 0 credits remaining", async () => {
    currentSupabaseMock = makeSupabaseMock({
      channel_events: [{ data: null, error: null }, { data: { id: "event-1" }, error: null }, { data: null, error: null }],
      conversations: [{ data: { id: "conv-1" }, error: null }],
      subscriptions: [{ data: { credits_remaining: 0 }, error: null }],
    });
    const { processInboundChannelMessage } = await import("@/lib/channels");

    const result = await processInboundChannelMessage({ bot, channel: "slack", externalUserId: "U123", text: "hi" });

    expect(runNonStreamingCompletionMock).not.toHaveBeenCalled();
    expect(result.duplicate).toBe(false);
    expect(result.reply).toMatch(/usage limit/i);
  });

  it("calls the AI gateway normally when the workspace can afford the message", async () => {
    currentSupabaseMock = makeSupabaseMock({
      channel_events: [{ data: null, error: null }, { data: { id: "event-1" }, error: null }, { data: null, error: null }],
      conversations: [{ data: { id: "conv-1" }, error: null }],
      subscriptions: [{ data: { credits_remaining: 500 }, error: null }],
      messages: [{ data: [], error: null }],
    });
    const { processInboundChannelMessage } = await import("@/lib/channels");

    const result = await processInboundChannelMessage({ bot, channel: "slack", externalUserId: "U123", text: "hi" });

    expect(runNonStreamingCompletionMock).toHaveBeenCalledTimes(1);
    expect(result.reply).toBe("AI-generated reply");
  });

  it("still short-circuits on a duplicate/redelivered channel event, before the credit check", async () => {
    currentSupabaseMock = makeSupabaseMock({
      channel_events: [{ data: { id: "already-processed" }, error: null }],
    });
    const { processInboundChannelMessage } = await import("@/lib/channels");

    const result = await processInboundChannelMessage({ bot, channel: "slack", externalUserId: "U123", text: "hi", externalEventId: "evt-dup" });

    expect(result).toEqual({ duplicate: true });
    expect(runNonStreamingCompletionMock).not.toHaveBeenCalled();
  });
});
