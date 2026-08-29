/**
 * Simplified from an earlier draft that also included three "typing
 * dot" details inside the bubble — at the sizes this actually renders
 * at (20-24px favicon/button contexts), that much detail just reads as
 * noise, not a recognizable mark. Bubble + anchor is the actual
 * signature idea; the dots weren't earning their place.
 *
 * Uses explicit literal colors rather than `currentColor` — an earlier
 * version inherited color from the parent, which broke the first time
 * it was rendered inside a button that already used a text color for
 * its OWN icon (the bubble and its would-be-contrasting details both
 * inherited the same color, becoming invisible against each other).
 * `variant` is the explicit, safe way to pick a bubble color that
 * contrasts with whatever surface this renders on.
 *
 * Named by surface, not by "default vs inverted": the app's default
 * surface is light (Figma-reference design system — see
 * tailwind.config.ts), so "onLight" is the default here. The rare
 * caller rendering this on a genuinely dark surface (e.g. inside a
 * black CTA block) passes `variant="onDark"` explicitly. The anchor
 * accent uses the brand's lime signature color regardless of variant —
 * it's a small enough detail that it reads as an intentional accent on
 * either a dark or light bubble.
 */
export function LogoMark({
  size = 24,
  className,
  variant = "onLight",
}: {
  size?: number;
  className?: string;
  variant?: "onDark" | "onLight";
}) {
  const bubbleColor = variant === "onDark" ? "#FAFAF7" : "#0C0D09";

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden="true">
      <rect x="12" y="16" width="76" height="52" rx="16" fill={bubbleColor} />
      <path d="M36 68 L36 84 L54 68 Z" fill={bubbleColor} />
      <path
        d="M40 84 Q28 94 18 98"
        stroke="#C3F53C"
        strokeWidth={5}
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="15" cy="99" r="6.5" fill="#C3F53C" />
    </svg>
  );
}
