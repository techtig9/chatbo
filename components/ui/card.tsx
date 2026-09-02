import type { HTMLAttributes } from "react";

/**
 * Chatbo design system — Card primitive (spec section 84).
 *
 * Seven variants, sharing one radius/padding/border scale so cards never
 * look randomly mixed on a page:
 *  - primary: the main content card on a page (bg-surface)
 *  - secondary: a nested/lower-emphasis card within a primary card (bg-elevated)
 *  - metric: a compact stat card (tighter padding, built for a number + label)
 *  - interactive: hoverable/clickable — a card that's also a link or button
 *  - warning / success / danger: tinted status cards (e.g. "3 conversations
 *    need review", "Agent published", "Indexing failed")
 */

const VARIANT_CLASSES: Record<string, string> = {
  primary: "border border-mist bg-surface",
  secondary: "border border-mist bg-elevated",
  metric: "border border-mist bg-surface transition hover:border-signal/30 hover:shadow-glow-sm",
  interactive: "border border-mist bg-surface transition hover:border-signal/40 hover:bg-surface/80 cursor-pointer",
  // Status variants use the pre-blended tints instead of `bg-x/10`. An alpha
  // fill composites against whatever sits behind the card, so a status card
  // dropped inside an `elevated` panel read differently from the same card on
  // the page. These resolve to one fixed value wherever the card lands.
  warning: "border border-warning-border bg-warning-soft",
  success: "border border-success-border bg-success-soft",
  danger: "border border-danger-border bg-danger-soft",
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof VARIANT_CLASSES;
}

export function Card({ variant = "primary", className = "", children, ...props }: CardProps) {
  const padding = variant === "metric" ? "p-4" : "p-5";
  return (
    <div className={`rounded-2xl ${padding} ${VARIANT_CLASSES[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}

/** Small eyebrow label used at the top of most cards/sections — the
 * "text-xs font-bold uppercase tracking-[0.16em] text-ink" pattern
 * already used ad hoc across ~15 pages, now a named component. */
export function CardEyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink">{children}</p>;
}
