"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, LoadingState, Badge } from "@pitchdeck/ui";
import type { DiscoveryPitchDto, PaginatedMeta } from "@pitchdeck/contracts";
import { apiFetch } from "@/lib/api-client";

export default function SponsorDiscoverPage() {
  const router = useRouter();
  const [items, setItems] = useState<DiscoveryPitchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetch<{ items: DiscoveryPitchDto[]; pagination: PaginatedMeta }>(
          "/discovery/pitches",
        );
        setItems(data.items);
      } catch {
        setDenied(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <LoadingState label="Loading discovery..." />
      </div>
    );
  }

  if (denied) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <p>Discovery requires membership in a verified sponsor organisation.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="mb-6 text-2xl font-semibold">Discover approved pitches</h1>
      <div className="grid gap-4">
        {items.map((pitch) => (
          <Card key={pitch.pitchId}>
            <CardContent className="p-4">
              <Link href={`/sponsor/discover/${pitch.pitchId}`} className="font-medium hover:underline">
                {pitch.title}
              </Link>
              <p className="mt-1 text-sm text-[var(--color-fg-muted)]">{pitch.shortSummary}</p>
              <div className="mt-2 flex gap-2">
                {pitch.innovationStage && <Badge>{pitch.innovationStage}</Badge>}
                {pitch.stateCode && <Badge variant="outline">{pitch.stateCode}</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
