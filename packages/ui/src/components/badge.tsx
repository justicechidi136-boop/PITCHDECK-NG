import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn.js";

export type BadgeVariant = "default" | "success" | "warning" | "outline";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-[var(--color-brand-primary)] text-white",
  success: "bg-[var(--color-brand-secondary)] text-white",
  warning: "bg-[var(--color-brand-accent)] text-[var(--color-fg)]",
  outline:
    "border border-[var(--color-border)] bg-transparent text-[var(--color-fg)]",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
