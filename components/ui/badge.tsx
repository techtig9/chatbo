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
/*
 * Fills use the pre-blended `*-soft` tints rather than `bg-x/10`: an alpha
 * fill composites against whatever is behind the badge, so the same `/10`
 * rendered differently on a page vs. inside an `elevated` panel, and the
 * contrast below could not be guaranteed. `neutral` also moves off `mist`,
 * which is the border token and was doing duty as a fill.
 *
 * Text uses the `-ink` variants where the base token is too light on its
 * own tint. Measured against the tint: ember 3.40:1 and danger 4.06:1 both
 * failed the 4.5:1 minimum (and had already been failing at 3.56:1 / 4.26:1
 * on the old alpha backgrounds), accent2 3.33:1 short at 4.33:1. The `-ink`
 * values clear 4.5:1 on the tint, on paper and on white. The dot keeps the
 * base colour — it is a fill, and it is decorative next to the label.
 */
const TONE_CLASSES: Record<string, string> = {
  neutral: "bg-neutral-soft text-slate",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-ember-ink",
  danger: "bg-danger-soft text-danger-ink",
  info: "bg-info-soft text-accent2-ink",
  accent: "bg-signal-soft text-ink",
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
