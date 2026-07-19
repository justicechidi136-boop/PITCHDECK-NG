"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, LoadingState } from "@pitchdeck/ui";
import type { DiscoveryPitchDto } from "@pitchdeck/contracts";
import { apiFetch } from "@/lib/api-client";

export default function DiscoverPitchDetailPage() {
  const params = useParams<{ pitchId: string }>();
  const router = useRouter();
  const [pitch, setPitch] = useState<DiscoveryPitchDto | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setPitch(await apiFetch<DiscoveryPitchDto>(`/discovery/pitches/${params.pitchId}`));
      } catch {
        router.push("/sponsor/discover");
      }
    })();
  }, [params.pitchId, router]);

  if (!pitch) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <LoadingState label="Loading pitch..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-4 text-2xl font-semibold">{pitch.title}</h1>
      <Card>
        <CardContent className="space-y-4 p-6">
          <section>
            <h2 className="font-medium">Problem</h2>
            <p className="whitespace-pre-wrap text-sm">{pitch.problemStatement}</p>
          </section>
          <section>
            <h2 className="font-medium">Solution</h2>
            <p className="whitespace-pre-wrap text-sm">{pitch.proposedSolution}</p>
          </section>
          {pitch.fundingAmountRequested && (
            <p className="text-sm">
              Funding requested: {pitch.fundingAmountRequested} {pitch.fundingCurrency}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
