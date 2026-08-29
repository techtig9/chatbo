import { describe, it, expect } from "vitest";
import {
  signUpSchema,
  signInSchema,
  passwordSchema,
  emailSchema,
} from "@/lib/validation/auth";

describe("emailSchema", () => {
  it("accepts a valid email", () => {
    expect(emailSchema.safeParse("founder@techtig.dev").success).toBe(true);
  });

  it("trims surrounding whitespace", () => {
    const result = emailSchema.safeParse("  founder@techtig.dev  ");
    expect(result.success && result.data).toBe("founder@techtig.dev");
  });

  it("rejects a malformed email", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("accepts a password with 8+ chars, an uppercase letter, and a number", () => {
    expect(passwordSchema.safeParse("Sup3rSecret").success).toBe(true);
  });

  it("rejects a password under 8 characters", () => {
    expect(passwordSchema.safeParse("Sh0rt1").success).toBe(false);
  });

  it("rejects a password with no uppercase letter", () => {
    expect(passwordSchema.safeParse("lowercase1").success).toBe(false);
  });

  it("rejects a password with no number", () => {
    expect(passwordSchema.safeParse("NoNumbersHere").success).toBe(false);
  });
});

describe("signUpSchema", () => {
  it("accepts a complete, valid signup payload", () => {
    const result = signUpSchema.safeParse({
      name: "Ada Lovelace",
      email: "ada@techtig.dev",
      password: "Analytic1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = signUpSchema.safeParse({
      name: "",
      email: "ada@techtig.dev",
      password: "Analytic1",
    });
    expect(result.success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("requires a non-empty password but doesn't enforce complexity", () => {
    // Login must accept whatever password the account was created with,
    // even a legacy weak one — complexity rules only apply at signup.
    const result = signInSchema.safeParse({
      email: "ada@techtig.dev",
      password: "x",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing password", () => {
    const result = signInSchema.safeParse({
      email: "ada@techtig.dev",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});
