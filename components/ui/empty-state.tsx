import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Chatbo design system — empty state (spec section 87).
 * "Every empty page must be useful": icon, explanation, primary action,
 * optional secondary action. E.g. "No agents yet → Create your first AI
 * agent", "No knowledge sources → Add knowledge".
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-mist bg-surface px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-signal/10 text-ink">
        <Icon size={22} />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-6 text-slate">{description}</p>
      {(action || secondaryAction) && (
        <div className="mt-5 flex items-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
