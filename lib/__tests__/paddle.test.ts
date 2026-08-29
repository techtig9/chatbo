import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { resolvePlanFromPriceId } from "@/lib/billing/paddle-plans";
import { verifyPaddleSignature } from "@/lib/billing/paddle-webhook";

describe("resolvePlanFromPriceId", () => {
  const map = {
    pri_starter_123: "starter" as const,
    pri_pro_456: "pro" as const,
    pri_business_789: "business" as const,
  };

  it("resolves a known price ID to its plan", () => {
    expect(resolvePlanFromPriceId("pri_starter_123", map)).toBe("starter");
    expect(resolvePlanFromPriceId("pri_pro_456", map)).toBe("pro");
    expect(resolvePlanFromPriceId("pri_business_789", map)).toBe("business");
  });

  it("returns null for an unknown price ID rather than guessing", () => {
    expect(resolvePlanFromPriceId("pri_unknown_000", map)).toBeNull();
  });

  it("returns null against an empty map (no price IDs configured yet)", () => {
    expect(resolvePlanFromPriceId("pri_starter_123", {})).toBeNull();
  });
});

describe("verifyPaddleSignature", () => {
  const secret = "whsec_test_secret";
  const body = JSON.stringify({ event_type: "subscription.created", data: { id: "sub_123" } });

  function sign(ts: string, rawBody: string, key: string): string {
    const hash = createHmac("sha256", key).update(`${ts}:${rawBody}`).digest("hex");
    return `ts=${ts};h1=${hash}`;
  }

  it("accepts a correctly signed payload", () => {
    const header = sign("1700000000", body, secret);
    expect(verifyPaddleSignature(body, header, secret)).toBe(true);
  });

  it("rejects a payload signed with the wrong secret", () => {
    const header = sign("1700000000", body, "wrong_secret");
    expect(verifyPaddleSignature(body, header, secret)).toBe(false);
  });

  it("rejects a tampered body that no longer matches the signature", () => {
    const header = sign("1700000000", body, secret);
    const tamperedBody = JSON.stringify({ event_type: "subscription.created", data: { id: "sub_EVIL" } });
    expect(verifyPaddleSignature(tamperedBody, header, secret)).toBe(false);
  });

  it("rejects a missing signature header", () => {
    expect(verifyPaddleSignature(body, null, secret)).toBe(false);
  });

  it("rejects a malformed signature header missing h1", () => {
    expect(verifyPaddleSignature(body, "ts=1700000000", secret)).toBe(false);
  });

  it("rejects a malformed signature header missing ts", () => {
    expect(verifyPaddleSignature(body, "h1=deadbeef", secret)).toBe(false);
  });

  it("rejects a signature of the wrong length rather than throwing", () => {
    expect(verifyPaddleSignature(body, "ts=1700000000;h1=abc", secret)).toBe(false);
  });
});
