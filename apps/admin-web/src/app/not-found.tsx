import Link from "next/link";
import { Button } from "@pitchdeck/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold text-[var(--color-fg)]">Page not found</h1>
      <Link href="/dashboard">
        <Button>Go to dashboard</Button>
      </Link>
    </div>
  );
}
