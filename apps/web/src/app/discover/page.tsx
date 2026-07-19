import { EmptyState } from "@pitchdeck/ui";
import Link from "next/link";
import { Button } from "@pitchdeck/ui";

export default function DiscoverPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <EmptyState
        title="Innovation discovery coming soon"
        description="This section will showcase curated innovations from across Nigeria once the platform launches full discovery features."
        action={
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        }
      />
    </div>
  );
}
