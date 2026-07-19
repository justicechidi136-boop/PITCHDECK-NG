"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent, LoadingState, Badge } from "@pitchdeck/ui";
import type { PitchDto, PitchSubmissionDto } from "@pitchdeck/contracts";
import { apiFetch } from "@/lib/api-client";

export default function PitchDetailPage() {
  const params = useParams<{ pitchId: string }>();
  const router = useRouter();
  const [pitch, setPitch] = useState<PitchDto | null>(null);
  const [submissions, setSubmissions] = useState<PitchSubmissionDto[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const [p, s] = await Promise.all([
          apiFetch<PitchDto>(`/pitches/${params.pitchId}`),
          apiFetch<PitchSubmissionDto[]>(`/pitches/${params.pitchId}/submissions`),
        ]);
        setPitch(p);
        setSubmissions(s);
      } catch {
        router.push("/login");
      }
    })();
  }, [params.pitchId, router]);

  if (!pitch) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <LoadingState label="Loading..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-2 text-2xl font-semibold">{pitch.title}</h1>
      <Badge>{pitch.status}</Badge>
      <Card className="mt-6">
        <CardContent className="p-6">
          <p className="whitespace-pre-wrap">{pitch.shortSummary}</p>
          <div className="mt-4 flex gap-3">
            <Link href={`/innovator/pitches/${pitch.id}/edit`}>
              <Button variant="outline">Edit draft</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
      {submissions.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 font-medium">Submission history</h2>
          <ul className="text-sm text-[var(--color-fg-muted)]">
            {submissions.map((s) => (
              <li key={s.id}>
                Version {s.version} — {s.reviewStatus} — {new Date(s.submittedAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
