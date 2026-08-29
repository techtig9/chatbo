import { describe, it, expect } from "vitest";
import { generateShareSlug } from "@/lib/sharing/slug";

describe("generateShareSlug", () => {
  it("defaults to a 10-character slug", () => {
    expect(generateShareSlug()).toHaveLength(10);
  });

  it("respects a custom length", () => {
    expect(generateShareSlug(6)).toHaveLength(6);
  });

  it("only uses lowercase letters and digits (URL-safe, no encoding needed)", () => {
    const slug = generateShareSlug(50);
    expect(slug).toMatch(/^[a-z0-9]+$/);
  });

  it("produces different slugs across calls (not a fixed/deterministic value)", () => {
    const slugs = new Set(Array.from({ length: 20 }, () => generateShareSlug()));
    expect(slugs.size).toBe(20);
  });
});
