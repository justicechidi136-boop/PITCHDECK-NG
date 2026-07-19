import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg-muted)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="font-display text-lg font-bold text-[var(--color-fg)]">
              PitchDeck Nigeria
            </p>
            <p className="mt-2 max-w-md text-sm text-[var(--color-fg-muted)]">
              A national platform connecting innovators, students, researchers, and
              community organisations with sponsors across Nigeria and the diaspora.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-fg)]">Platform</h3>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-fg-muted)]">
              <li>
                <Link href="/discover" className="hover:text-[var(--color-fg)]">
                  Discover Innovations
                </Link>
              </li>
              <li>
                <Link href="/auth/register" className="hover:text-[var(--color-fg)]">
                  Submit Your Idea
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-fg)]">Legal</h3>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-fg-muted)]">
              <li>
                <Link href="/privacy" className="hover:text-[var(--color-fg)]">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[var(--color-fg)]">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="mt-8 text-xs text-[var(--color-fg-muted)]">
          © {new Date().getFullYear()} PitchDeck Nigeria. Built for Nigerian innovation.
        </p>
      </div>
    </footer>
  );
}
