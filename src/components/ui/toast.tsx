"use client";

import { CircleAlert, Check, X } from "lucide-react";
import { createContext, use, useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Small, dependency-free toasts for action feedback: "Completed · Undo",
 * "Event saved", or an error when an optimistic update fails. They announce
 * through a polite live region (no focus change) and dismiss themselves.
 */

interface ToastInput {
  message: string;
  tone?: "default" | "error";
  action?: { label: string; onAction: () => void };
}

interface Toast extends ToastInput {
  id: number;
}

interface ToastApi {
  show: (toast: ToastInput) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
const DISMISS_MS = 4000;
const DISMISS_WITH_ACTION_MS = 6000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (toast: ToastInput) => {
      nextId.current += 1;
      const id = nextId.current;
      // Keep at most three on screen; the newest replaces the oldest.
      setToasts((current) => [...current.slice(-2), { ...toast, id }]);
      window.setTimeout(() => dismiss(id), toast.action ? DISMISS_WITH_ACTION_MS : DISMISS_MS);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(() => ({ show, error: (message) => show({ message, tone: "error" }) }), [show]);

  return (
    <ToastContext value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm animate-toast items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-pop",
              toast.tone === "error" ? "bg-danger text-white dark:text-bg" : "bg-secondary text-secondary-fg",
            )}
          >
            {toast.tone === "error" ? <CircleAlert className="size-4 shrink-0" aria-hidden /> : <Check className="size-4 shrink-0" aria-hidden />}
            <p className="min-w-0 flex-1">{toast.message}</p>
            {toast.action ? (
              <button
                type="button"
                className="rounded-md px-2 py-1 font-semibold underline-offset-2 hover:underline"
                onClick={() => {
                  toast.action?.onAction();
                  dismiss(toast.id);
                }}
              >
                {toast.action.label}
              </button>
            ) : null}
            <button
              type="button"
              className="-mr-1 grid size-7 place-items-center rounded-md opacity-70 hover:opacity-100"
              aria-label="Dismiss"
              onClick={() => dismiss(toast.id)}
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

/** Toast API; a silent no-op outside the provider (for example on the landing page). */
export function useToast(): ToastApi {
  return use(ToastContext) ?? NOOP;
}

const NOOP: ToastApi = { show: () => {}, error: () => {} };
