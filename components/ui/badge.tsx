/**
 * Chatbo design system — status badge/pill.
 *
 * Formalizes the `bg-X/10 text-X` status-chip pattern that was already in
 * use ad hoc across ~15+ pages (knowledge source status, bot published
 * state, audit event result, subscription status, ...) — several of those
 * call sites used the primary-accent token (`signal`) to mean "healthy/
 * connected/success" before this design system introduced a dedicated
 * `success` color, which is what this component now standardizes on.
 */
const TONE_CLASSES: Record<string, string> = {
  neutral: "bg-mist text-slate",
  success: "bg-success/10 text-success",
  warning: "bg-ember/10 text-ember",
  danger: "bg-danger/10 text-danger",
  info: "bg-accent2/10 text-accent2",
  accent: "bg-signal/10 text-ink",
};

export function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: keyof typeof TONE_CLASSES;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium capitalize ${TONE_CLASSES[tone]} ${className}`}>
      {children}
    </span>
  );
}
