import { cn } from "../lib/cn.js";

export interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({ label = "Loading...", className }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-12",
        className,
      )}
    >
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-brand-primary)]"
        aria-hidden="true"
      />
      <p className="text-sm text-[var(--color-fg-muted)]">{label}</p>
    </div>
  );
}
