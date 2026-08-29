import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

/**
 * Chatbo design system — Button primitive (spec section 85).
 *
 * Four variants:
 *  - primary: lime accent fill — the one high-emphasis action on a page
 *  - secondary: elevated surface — the common "second" action
 *  - tertiary: transparent/muted — low-emphasis, inline actions
 *  - danger: subtle red — destructive actions
 *
 * All variants implement hover / active / focus-visible / disabled.
 * `loading` shows a spinner in place of the icon and disables the button
 * without changing its size (so a page doesn't reflow when a submit
 * button starts loading).
 *
 * This is new, opt-in infrastructure — existing pages that hand-roll
 * their own <button className="..."> are not yet using this component.
 * Adopting it page-by-page is follow-on work; introducing it here is
 * what lets that follow-on work stay consistent instead of every page
 * inventing its own button styling again.
 */

const VARIANT_CLASSES: Record<string, string> = {
  // Bright lime needs dark text for real contrast — white-on-lime was
  // the purple-gradient era's pairing and doesn't carry over.
  primary:
    "bg-accent-gradient text-ink shadow-glow-sm hover:shadow-glow hover:brightness-105 active:brightness-95",
  secondary:
    "border border-mist bg-elevated text-ink hover:border-signal/60 hover:bg-elevated/80 active:bg-elevated/60",
  tertiary:
    "text-slate hover:bg-elevated hover:text-ink active:bg-elevated/70",
  danger:
    "border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20 active:bg-danger/25",
};

const SIZE_CLASSES: Record<string, string> = {
  sm: "gap-1.5 rounded-lg px-3 py-1.5 text-xs",
  md: "gap-2 rounded-lg px-4 py-2 text-sm",
  lg: "gap-2 rounded-xl px-5 py-2.5 text-sm",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tertiary" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, icon, disabled, className = "", children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 size={size === "sm" ? 13 : 15} className="animate-spin" /> : icon}
      {children}
    </button>
  );
});
