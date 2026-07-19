"use client";

import { useTheme } from "next-themes";

export function AdminHeader() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)] px-6">
      <div>
        <p className="text-sm text-[var(--color-fg-muted)]">Secure admin area</p>
        <h1 className="text-lg font-semibold text-[var(--color-fg)]">Operations Console</h1>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Toggle theme"
          className="rounded-md px-2 py-1 text-sm text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-muted)]"
          onClick={() => {
            setTheme(theme === "dark" ? "light" : "dark");
          }}
        >
          Theme
        </button>
      </div>
    </header>
  );
}
