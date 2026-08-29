"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";

interface ToastItem {
  id: number;
  type: "success" | "error";
  message: string;
}

interface ToastContextValue {
  showToast: (type: "success" | "error", message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

let nextId = 1;

/**
 * Chatbo design system — toast (spec section 89: "after successful
 * actions: toast, inline status, animation where appropriate, updated
 * data immediately"). Mounted once at the dashboard layout; any client
 * component below it can call useToast().showToast(...).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, type, message }]);
    // Auto-dismiss — a toast that never goes away is just a second
    // inline banner with extra steps.
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const dismiss = useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`animate-modal-in pointer-events-auto flex w-[calc(100vw-2rem)] max-w-sm items-start gap-2.5 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-md ${
              t.type === "success" ? "border-success/30 bg-surface/95 text-ink" : "border-danger/30 bg-surface/95 text-ink"
            }`}
          >
            {t.type === "success" ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <XCircle size={18} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
            )}
            <p className="flex-1 text-sm leading-5">{t.message}</p>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="shrink-0 text-slate hover:text-ink">
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
