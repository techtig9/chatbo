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
  warning: "border border-ember/30 bg-ember/10",
  success: "border border-success/30 bg-success/10",
  danger: "border border-danger/30 bg-danger/10",
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
