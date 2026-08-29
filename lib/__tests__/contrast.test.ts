import { describe, it, expect } from "vitest";
import { contrastRatio, contrastLevel, checkBrandColorContrast } from "@/lib/a11y/contrast";

describe("contrastRatio", () => {
  it("black on white is the maximum ratio, 21:1", () => {
    const ratio = contrastRatio("#000000", "#FFFFFF");
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeCloseTo(21, 0);
  });

  it("a color against itself is always 1:1", () => {
    expect(contrastRatio("#1FA6A0", "#1FA6A0")).toBeCloseTo(1, 5);
  });

  it("is symmetric — order doesn't matter", () => {
    const a = contrastRatio("#12233A", "#FFFFFF")!;
    const b = contrastRatio("#FFFFFF", "#12233A")!;
    expect(a).toBeCloseTo(b, 5);
  });

  it("matches a known reference ratio (#767676 on white is ~4.5:1, the classic AA boundary gray)", () => {
    const ratio = contrastRatio("#767676", "#FFFFFF");
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeGreaterThan(4.4);
    expect(ratio!).toBeLessThan(4.6);
  });

  it("handles hex without a leading #", () => {
    expect(contrastRatio("000000", "FFFFFF")).toBeCloseTo(21, 0);
  });

  it("returns null for an unparseable color", () => {
    expect(contrastRatio("not-a-color", "#FFFFFF")).toBeNull();
    expect(contrastRatio("#FFFFFF", "red")).toBeNull();
  });

  it("returns null for a 3-digit shorthand hex (not supported — bots store full 6-digit hex)", () => {
    expect(contrastRatio("#FFF", "#000")).toBeNull();
  });
});

describe("contrastLevel", () => {
  it("classifies null ratio as fail", () => {
    expect(contrastLevel(null)).toBe("fail");
  });

  it("classifies below 3:1 as fail", () => {
    expect(contrastLevel(2.9)).toBe("fail");
  });

  it("classifies 3:1–4.49:1 as aa-large-only", () => {
    expect(contrastLevel(3)).toBe("aa-large-only");
    expect(contrastLevel(4.4)).toBe("aa-large-only");
  });

  it("classifies 4.5:1–6.99:1 as aa", () => {
    expect(contrastLevel(4.5)).toBe("aa");
    expect(contrastLevel(6.9)).toBe("aa");
  });

  it("classifies 7:1+ as aaa", () => {
    expect(contrastLevel(7)).toBe("aaa");
    expect(contrastLevel(21)).toBe("aaa");
  });
});

describe("checkBrandColorContrast", () => {
  it("warns for a light/pastel color that would be unreadable as white-text bubble background", () => {
    const warning = checkBrandColorContrast("#FFEE99"); // pale yellow
    expect(warning).not.toBeNull();
  });

  it("does not warn for the product's own ink color (dark enough)", () => {
    expect(checkBrandColorContrast("#12233A")).toBeNull();
  });

  it("DOES warn for the product's own signal teal (#1FA6A0) — a real finding: at ~2.99:1 against white, it fails contrast for chat bubble text outright, not just borderline. Worth revisiting in the brand system itself, not just flagging for customers.", () => {
    expect(checkBrandColorContrast("#1FA6A0")).not.toBeNull();
  });

  it("does not warn for black", () => {
    expect(checkBrandColorContrast("#000000")).toBeNull();
  });

  it("warns for an invalid color rather than silently passing it", () => {
    expect(checkBrandColorContrast("garbage")).not.toBeNull();
  });
});
