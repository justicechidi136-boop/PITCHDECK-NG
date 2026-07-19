"use client";

import { Button } from "@pitchdeck/ui";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold text-[var(--color-fg)]">Admin console error</h1>
      <p className="text-sm text-[var(--color-fg-muted)]">
        Something went wrong while loading this page.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
