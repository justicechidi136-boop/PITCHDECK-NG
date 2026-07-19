import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed",
        "border-[var(--color-border)] bg-[var(--color-bg-muted)] px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? <div className="mb-4 text-[var(--color-brand-primary)]">{icon}</div> : null}
      <h3 className="text-lg font-semibold text-[var(--color-fg)]">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-[var(--color-fg-muted)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
