"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "../lib/cn.js";

export type ToastVariant = "default" | "success" | "error";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastContextValue {
  toasts: ToastMessage[];
  showToast: (toast: Omit<ToastMessage, "id">) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((toast: Omit<ToastMessage, "id">) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { ...toast, id }]);
    setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const value = useMemo(
    () => ({ toasts, showToast, dismissToast }),
    [toasts, showToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

function ToastViewport() {
  const { toasts, dismissToast } = useToast();

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={cn(
            "rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4 shadow-lg",
            toast.variant === "success" && "border-[var(--color-brand-secondary)]",
            toast.variant === "error" && "border-red-500",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-[var(--color-fg)]">{toast.title}</p>
              {toast.description ? (
                <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
                  {toast.description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              className="text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
              onClick={() => {
                dismissToast(toast.id);
              }}
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
