/**
 * WCAG 2.1 contrast ratio between two colors, per the standard formula:
 * (L1 + 0.05) / (L2 + 0.05) where L1 is the lighter relative luminance.
 * Used to warn a customer if their chosen brand color would make chat
 * bubble text hard to read — the auto-contrast check the Brand & Design
 * System spec asked for, not just a color picker with no feedback.
 */

function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const int = parseInt(match[1]!, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const channel = c / 255;
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** Returns null for an unparseable color rather than throwing — callers
 * treat null as "can't verify, don't block on it." */
export function contrastRatio(hexA: string, hexB: string): number | null {
  const rgbA = hexToRgb(hexA);
  const rgbB = hexToRgb(hexB);
  if (!rgbA || !rgbB) return null;

  const lumA = relativeLuminance(rgbA);
  const lumB = relativeLuminance(rgbB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

export type ContrastLevel = "fail" | "aa-large-only" | "aa" | "aaa";

/**
 * WCAG 2.1 thresholds for normal-size text: AA needs 4.5:1, AAA needs
 * 7:1. 3:1 is the AA threshold for LARGE text only (18pt+, or 14pt+
 * bold) — chat bubble text is normal-size, so "aa-large-only" here
 * means "would pass for a heading, not for the actual message text,"
 * which is exactly the gap worth warning about.
 */
export function contrastLevel(ratio: number | null): ContrastLevel {
  if (ratio === null) return "fail";
  if (ratio >= 7) return "aaa";
  if (ratio >= 4.5) return "aa";
  if (ratio >= 3) return "aa-large-only";
  return "fail";
}

/**
 * The actual check the bot editor runs: does this brand color have
 * readable contrast against white text (what's rendered on top of it
 * in the user's own chat bubble)? Returns a warning message, or null
 * if contrast is fine.
 */
export function checkBrandColorContrast(brandColorHex: string): string | null {
  const ratio = contrastRatio(brandColorHex, "#FFFFFF");
  const level = contrastLevel(ratio);

  if (level === "fail" || level === "aa-large-only") {
    return "This color may be hard to read as chat bubble text — consider a darker shade.";
  }
  return null;
}
