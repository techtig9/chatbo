import { describe, expect, it } from "vitest";
import { toUserMessage } from "@/lib/errors/user-facing";

describe("toUserMessage", () => {
  it("never leaks the raw exception message for an unrecognized error", () => {
    const err = new Error("TypeError: Cannot read properties of undefined (reading 'foo') at Object.<anonymous> (/app/lib/foo.ts:42:10)");
    const message = toUserMessage(err, "process that file");
    expect(message).not.toContain("TypeError");
    expect(message).not.toContain("/app/lib/foo.ts");
    expect(message).not.toContain("<anonymous>");
  });

  it("classifies network/timeout errors with an actionable retry message", () => {
    expect(toUserMessage(new Error("fetch failed"), "index that source")).toMatch(/temporarily unavailable.*try again/i);
    expect(toUserMessage(new Error("Request timed out after 30000ms"), "index that source")).toMatch(/temporarily unavailable/i);
    expect(toUserMessage(new Error("connect ECONNREFUSED 127.0.0.1:443"), "index that source")).toMatch(/temporarily unavailable/i);
  });

  it("classifies rate-limit errors distinctly from generic failures", () => {
    const message = toUserMessage(new Error("429 Too Many Requests"), "generate your agent");
    expect(message).toMatch(/rate limit/i);
    expect(message).toContain("generate your agent");
  });

  it("classifies auth errors as a credential/reconnect issue", () => {
    const message = toUserMessage(new Error("401 Unauthorized: invalid api key"), "sync your calendar");
    expect(message).toMatch(/authenticate|reconnect/i);
  });

  it("classifies not-found errors distinctly", () => {
    const message = toUserMessage(new Error("404: resource not found"), "fetch that URL");
    expect(message).toMatch(/couldn't find/i);
  });

  it("falls back to a generic, still-actionable message for anything unrecognized", () => {
    const message = toUserMessage(new Error("duplicate key value violates unique constraint \"bots_pkey\""), "create your agent");
    expect(message).toContain("create your agent");
    expect(message).toMatch(/try again/i);
    expect(message).not.toContain("constraint");
    expect(message).not.toContain("bots_pkey");
  });

  it("handles non-Error thrown values without crashing", () => {
    expect(() => toUserMessage("a raw string throw", "do the thing")).not.toThrow();
    expect(() => toUserMessage(undefined, "do the thing")).not.toThrow();
    expect(() => toUserMessage({ weird: "object" }, "do the thing")).not.toThrow();
  });

  it("weaves the caller's context into the message so it's specific to what failed", () => {
    const message = toUserMessage(new Error("weird unrecognized failure"), "publish your agent");
    expect(message).toContain("publish your agent");
  });
});
