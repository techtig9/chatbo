"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Chatbo design system — Modal primitive (spec section 86). Every
 * required element in one place: dark surface, rounded corners, subtle
 * border, backdrop blur, smooth scale/fade (the same animate-modal-in
 * keyframe CommandPalette already uses), a clear close button, Escape
 * to close, and a focus trap (focus moves into the dialog on open and
 * is cycled with Tab/Shift+Tab so it can never escape to page content
 * behind the backdrop).
 *
 * CommandPalette (Phase 6) and MobileNavDrawer (Phase 21) each built
 * their own version of this same backdrop/escape/focus-trap logic
 * ad hoc; this is the primitive that should have existed for both,
 * extracted now so every future modal starts from one implementation
 * instead of a fourth copy.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Pass instead of `title` when the dialog's own heading element
   * should serve as the accessible name (avoids a duplicate visual title). */
  labelledBy?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    (focusable?.[0] ?? dialog)?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !focusable || focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-paper/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={labelledBy ? undefined : title}
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className="animate-modal-in relative w-full max-w-md rounded-2xl border border-mist bg-surface p-6 shadow-2xl outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate transition hover:bg-elevated hover:text-ink"
        >
          <X size={18} aria-hidden="true" />
        </button>
        {title && <h2 className="mb-4 pr-8 font-display text-lg font-semibold text-ink">{title}</h2>}
        {children}
      </div>
    </div>,
    document.body
  );
}
