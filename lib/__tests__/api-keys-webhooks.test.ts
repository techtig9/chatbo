import { describe, it, expect } from "vitest";
import {
  generateApiKey,
  hashApiKey,
  apiKeyLastFour,
  isValidApiKeyFormat,
  scopeAllows,
} from "@/lib/api-keys/keys";
import { signWebhookPayload, buildWebhookSignatureHeader } from "@/lib/webhooks/sign";
import { generateWebhookSecret } from "@/lib/webhooks/secret";

describe("generateApiKey", () => {
  it("starts with the cb_live_ prefix", () => {
    expect(generateApiKey()).toMatch(/^cb_live_/);
  });

  it("passes its own format validator", () => {
    expect(isValidApiKeyFormat(generateApiKey())).toBe(true);
  });

  it("generates unique keys", () => {
    const keys = new Set(Array.from({ length: 20 }, generateApiKey));
    expect(keys.size).toBe(20);
  });
});

describe("isValidApiKeyFormat", () => {
  it("rejects a key with the wrong prefix", () => {
    expect(isValidApiKeyFormat("sk_test_abc123")).toBe(false);
  });

  it("rejects a truncated key", () => {
    expect(isValidApiKeyFormat("cb_live_short")).toBe(false);
  });
});

describe("hashApiKey", () => {
  it("is deterministic", () => {
    const key = generateApiKey();
    expect(hashApiKey(key)).toBe(hashApiKey(key));
  });

  it("differs for different keys", () => {
    expect(hashApiKey(generateApiKey())).not.toBe(hashApiKey(generateApiKey()));
  });
});

describe("apiKeyLastFour", () => {
  it("returns the last 4 characters", () => {
    expect(apiKeyLastFour("cb_live_abcdWXYZ")).toBe("WXYZ");
  });
});

describe("scopeAllows", () => {
  it("a read-only key allows read but not write", () => {
    expect(scopeAllows(["read"], "read")).toBe(true);
    expect(scopeAllows(["read"], "write")).toBe(false);
  });

  it("a read-write key allows both", () => {
    expect(scopeAllows(["read", "write"], "read")).toBe(true);
    expect(scopeAllows(["read", "write"], "write")).toBe(true);
  });

  it("an empty scope list allows nothing", () => {
    expect(scopeAllows([], "read")).toBe(false);
  });
});

describe("generateWebhookSecret", () => {
  it("starts with whsec_", () => {
    expect(generateWebhookSecret()).toMatch(/^whsec_/);
  });

  it("generates unique secrets", () => {
    const secrets = new Set(Array.from({ length: 10 }, generateWebhookSecret));
    expect(secrets.size).toBe(10);
  });
});

describe("webhook signing", () => {
  const secret = "whsec_test";
  const payload = JSON.stringify({ event: "conversation.started", data: { id: "conv_1" } });

  it("produces a verifiable signature (matches the Paddle-style verification approach)", () => {
    const { header, timestamp } = buildWebhookSignatureHeader(payload, secret);
    expect(header).toBe(`ts=${timestamp};h1=${signWebhookPayload(payload, timestamp, secret)}`);
  });

  it("produces different signatures for different payloads", () => {
    const sig1 = signWebhookPayload(payload, "1700000000", secret);
    const sig2 = signWebhookPayload(payload + "x", "1700000000", secret);
    expect(sig1).not.toBe(sig2);
  });

  it("produces different signatures for different secrets", () => {
    const sig1 = signWebhookPayload(payload, "1700000000", "secret1");
    const sig2 = signWebhookPayload(payload, "1700000000", "secret2");
    expect(sig1).not.toBe(sig2);
  });

  it("produces different signatures for different timestamps (replay resistance)", () => {
    const sig1 = signWebhookPayload(payload, "1700000000", secret);
    const sig2 = signWebhookPayload(payload, "1700000001", secret);
    expect(sig1).not.toBe(sig2);
  });
});
