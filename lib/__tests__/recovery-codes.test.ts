import { describe, it, expect } from "vitest";
import { generateRecoveryCodes, hashRecoveryCode, RECOVERY_CODE_COUNT } from "@/lib/mfa/recovery-codes";

describe("generateRecoveryCodes", () => {
  it("generates the default count of codes", () => {
    expect(generateRecoveryCodes()).toHaveLength(RECOVERY_CODE_COUNT);
  });

  it("respects a custom count", () => {
    expect(generateRecoveryCodes(3)).toHaveLength(3);
  });

  it("formats each code as XXXXX-XXXXX", () => {
    const codes = generateRecoveryCodes(5);
    for (const code of codes) {
      expect(code).toMatch(/^[A-Z0-9]{5}-[A-Z0-9]{5}$/);
    }
  });

  it("never includes visually ambiguous characters (0, O, 1, I)", () => {
    const codes = generateRecoveryCodes(50);
    for (const code of codes) {
      expect(code).not.toMatch(/[01OI]/);
    }
  });

  it("generates unique codes within a batch", () => {
    const codes = generateRecoveryCodes(20);
    expect(new Set(codes).size).toBe(20);
  });
});

describe("hashRecoveryCode", () => {
  it("produces the same hash for the same code", () => {
    expect(hashRecoveryCode("ABCDE-FGHJK")).toBe(hashRecoveryCode("ABCDE-FGHJK"));
  });

  it("is case-insensitive", () => {
    expect(hashRecoveryCode("abcde-fghjk")).toBe(hashRecoveryCode("ABCDE-FGHJK"));
  });

  it("ignores surrounding and internal whitespace", () => {
    expect(hashRecoveryCode("  ABCDE-FGHJK  ")).toBe(hashRecoveryCode("ABCDE-FGHJK"));
    expect(hashRecoveryCode("ABCDE - FGHJK")).toBe(hashRecoveryCode("ABCDE-FGHJK"));
  });

  it("produces different hashes for different codes", () => {
    expect(hashRecoveryCode("ABCDE-FGHJK")).not.toBe(hashRecoveryCode("ABCDE-FGHJZ"));
  });

  it("returns a 64-character hex string", () => {
    expect(hashRecoveryCode("ABCDE-FGHJK")).toMatch(/^[0-9a-f]{64}$/);
  });
});
