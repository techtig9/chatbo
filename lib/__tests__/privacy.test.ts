import { describe, expect, it } from "vitest";
import { detectSensitiveData, redactSensitiveData, retentionDueAt } from "@/lib/security/privacy";

describe("privacy utilities", () => {
  it("detects common sensitive values", () => {
    const types = detectSensitiveData("Contact test@example.com from 203.0.113.10");
    expect(types).toContain("email");
    expect(types).toContain("ip_address");
  });
  it("redacts detected values", () => {
    expect(redactSensitiveData("email test@example.com")).toContain("[REDACTED:email]");
  });
  it("bounds retention windows", () => {
    const start = new Date("2026-01-01T00:00:00Z");
    expect(retentionDueAt(10, start).toISOString()).toBe("2026-01-31T00:00:00.000Z");
  });
});
