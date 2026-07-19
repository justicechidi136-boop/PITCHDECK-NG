"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "@pitchdeck/ui";

export function SiteHeader() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-brand-primary)] text-sm font-bold text-white"
          >
            PD
          </span>
          <span className="font-display text-lg font-bold text-[var(--color-fg)]">
            PitchDeck Nigeria
          </span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-6 md:flex">
          <Link
            href="#sectors"
            className="text-sm font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
          >
            Sectors
          </Link>
          <Link
            href="#how-it-works"
            className="text-sm font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
          >
            How It Works
          </Link>
          <Link
            href="/auth/login"
            className="text-sm font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
          >
            Sign In
          </Link>
        </nav>

        <div className="flex items-center gap-2">
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
          <Link href="/auth/register">
            <Button variant="primary" size="sm">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
