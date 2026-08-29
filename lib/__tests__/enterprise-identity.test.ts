import { describe, expect, it } from "vitest";
import { generateScimToken, hashScimToken } from "@/lib/enterprise-identity";

describe("enterprise identity", () => {
  it("generates hashed SCIM credentials without storing the raw token", () => {
    const token = generateScimToken();
    expect(token.startsWith("cb_scim_")).toBe(true);
    expect(hashScimToken(token)).not.toBe(token);
    expect(hashScimToken(token)).toHaveLength(64);
  });
});
