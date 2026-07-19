"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNavItems } from "@/config/navigation";
import { cn } from "@pitchdeck/ui";

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg-muted)] md:block">
      <div className="flex h-16 items-center border-b border-[var(--color-border)] px-6">
        <span className="font-semibold text-[var(--color-fg)]">PitchDeck Admin</span>
      </div>
      <nav aria-label="Admin navigation" className="p-4">
        <ul className="space-y-1">
          {adminNavItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-[var(--color-brand-primary)] text-white"
                      : "text-[var(--color-fg-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-fg)]",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
