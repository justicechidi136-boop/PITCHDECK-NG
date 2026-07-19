import Link from "next/link";
import { Button } from "@pitchdeck/ui";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="text-sm font-semibold text-[var(--color-brand-accent)]">404</p>
      <h1 className="font-display text-2xl font-bold text-[var(--color-fg)]">
        Page not found
      </h1>
      <p className="text-sm text-[var(--color-fg-muted)]">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link href="/">
        <Button>Return home</Button>
      </Link>
    </div>
  );
}
