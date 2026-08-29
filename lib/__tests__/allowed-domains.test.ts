import { describe, it, expect } from "vitest";
import { parseAllowedDomains } from "@/lib/validation/publish";

describe("parseAllowedDomains", () => {
  it("accepts a clean list of valid domains", () => {
    const result = parseAllowedDomains("example.com\nshop.example.com\nmy-site.co.uk");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.domains).toEqual(["example.com", "shop.example.com", "my-site.co.uk"]);
    }
  });

  it("trims whitespace and drops empty lines", () => {
    const result = parseAllowedDomains("  example.com  \n\n  shop.example.com\n");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.domains).toEqual(["example.com", "shop.example.com"]);
    }
  });

  it("lowercases domains", () => {
    const result = parseAllowedDomains("Example.COM");
    expect(result.success).toBe(true);
    if (result.success) expect(result.domains).toEqual(["example.com"]);
  });

  it("returns success with an empty array for empty input (no restriction)", () => {
    const result = parseAllowedDomains("");
    expect(result.success).toBe(true);
    if (result.success) expect(result.domains).toEqual([]);
  });

  it("rejects a full URL instead of a bare domain", () => {
    const result = parseAllowedDomains("https://example.com");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("bare domain");
  });

  it("rejects a domain with a path", () => {
    const result = parseAllowedDomains("example.com/path");
    expect(result.success).toBe(false);
  });

  it("rejects a domain with a space", () => {
    const result = parseAllowedDomains("example .com");
    expect(result.success).toBe(false);
  });

  it("rejects a bare word with no TLD", () => {
    const result = parseAllowedDomains("localhost");
    expect(result.success).toBe(false);
  });

  it("rejects a label starting or ending with a hyphen", () => {
    expect(parseAllowedDomains("-example.com").success).toBe(false);
    expect(parseAllowedDomains("example-.com").success).toBe(false);
  });

  it("rejects more than 50 domains", () => {
    const many = Array.from({ length: 51 }, (_, i) => `site${i}.com`).join("\n");
    const result = parseAllowedDomains(many);
    expect(result.success).toBe(false);
  });

  it("accepts exactly 50 domains", () => {
    const fifty = Array.from({ length: 50 }, (_, i) => `site${i}.com`).join("\n");
    const result = parseAllowedDomains(fifty);
    expect(result.success).toBe(true);
  });
});
