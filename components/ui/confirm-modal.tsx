"use client";

import { AlertTriangle, Rocket } from "lucide-react";
import { Modal } from "./modal";
import { Button } from "./button";

/**
 * The "Delete Agent" / "Disconnect Integration" / "Publish Agent"
 * pattern spec section 86 names explicitly — destructive confirmations
 * were previously window.confirm() at 3 call sites, a native browser
 * dialog with no styling control, no focus trap, and no relationship to
 * the app's own dark design system. "Publish" isn't destructive, so it
 * gets its own tone rather than reusing the danger styling for an
 * action that's actually a positive, deliberate one.
 */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
  pending = false,
  tone = "danger",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  pending?: boolean;
  tone?: "danger" | "primary";
}) {
  const isDanger = tone === "danger";
  return (
    <Modal open={open} onClose={onClose} labelledBy="confirm-modal-title">
      <div className="flex gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isDanger ? "bg-danger/10 text-danger" : "bg-signal/10 text-ink"}`}>
          {isDanger ? <AlertTriangle size={18} aria-hidden="true" /> : <Rocket size={18} aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1 pr-6">
          <h2 id="confirm-modal-title" className="font-display text-lg font-semibold text-ink">{title}</h2>
          <p className="mt-1.5 text-sm leading-6 text-slate">{message}</p>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="tertiary" onClick={onClose} disabled={pending}>Cancel</Button>
        <Button variant={isDanger ? "danger" : "primary"} onClick={onConfirm} loading={pending}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
