import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/a11y/contrast";

// Regression guard for a real, severe accessibility bug found during the
// Figma-redesign theme migration's final hardening pass: the new
// signal (lime) token measures ~1.2:1 as *text* against the light
// theme's page/card backgrounds — nowhere near WCAG's 4.5:1 minimum for
// normal text, even though it's excellent (>15:1) as a background with
// dark text. `signal-ink` exists specifically as the text-safe variant.
// These numbers are the actual token hex values, not stand-ins — if
// tailwind.config.ts's colors ever change, this test should be revisited
// alongside them, not silently left checking stale values.
const PAPER = "#FAFAF7";
const SURFACE = "#FFFFFF";
const INK = "#0C0D09";
const SIGNAL = "#C3F53C";
const SIGNAL_INK = "#4F6B08";
const SUCCESS = "#0F7A38";
const DANGER = "#D33232";

describe("theme contrast — light/black/lime system", () => {
  it("signal (bright lime) fails WCAG as text on the light theme's backgrounds", () => {
    // This is *expected* to fail — it's why signal-ink exists. Asserting
    // the failure keeps the reasoning documented and catches anyone
    // "simplifying" back to a single signal token later.
    expect(contrastRatio(SIGNAL, PAPER)!).toBeLessThan(4.5);
    expect(contrastRatio(SIGNAL, SURFACE)!).toBeLessThan(4.5);
  });

  it("signal-ink (the text-safe variant) passes WCAG AA normal text on both page and card backgrounds", () => {
    expect(contrastRatio(SIGNAL_INK, PAPER)!).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(SIGNAL_INK, SURFACE)!).toBeGreaterThanOrEqual(4.5);
  });

  it("signal (bright lime) passes WCAG comfortably as a background with ink (dark) text — the correct pairing for buttons/badges/active-states", () => {
    expect(contrastRatio(SIGNAL, INK)!).toBeGreaterThanOrEqual(7); // comfortably above even AAA (7:1)
  });

  it("success green passes WCAG AA normal text against white — the original token measured 4.17:1 and failed", () => {
    expect(contrastRatio(SUCCESS, SURFACE)!).toBeGreaterThanOrEqual(4.5);
  });

  it("danger red passes WCAG AA normal text against white", () => {
    expect(contrastRatio(DANGER, SURFACE)!).toBeGreaterThanOrEqual(4.5);
  });

  it("ink (primary text) passes WCAG AAA against both page and card backgrounds", () => {
    expect(contrastRatio(INK, PAPER)!).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(INK, SURFACE)!).toBeGreaterThanOrEqual(7);
  });
});
