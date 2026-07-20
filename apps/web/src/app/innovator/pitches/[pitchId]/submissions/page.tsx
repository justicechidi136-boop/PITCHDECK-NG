"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, LoadingState, Badge, Button } from "@pitchdeck/ui";
import type { PitchDto, PitchSubmissionDto } from "@pitchdeck/contracts";
import { apiFetch } from "@/lib/api-client";

export default function PitchSubmissionsPage() {
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
        <LoadingState label="Loading submissions..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{pitch.title}</h1>
          <p className="text-sm text-[var(--color-fg-muted)]">Submission history</p>
        </div>
        <Link href={`/innovator/pitches/${pitch.id}`}>
          <Button variant="outline">Back to pitch</Button>
        </Link>
      </div>
      {submissions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-[var(--color-fg-muted)]">
            No submissions yet. Submit your pitch from the edit screen when it is complete.
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-4">
          {submissions.map((submission) => (
            <li key={submission.id}>
              <Card>
                <CardContent className="flex flex-col gap-2 p-6">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Version {submission.version}</span>
                    <Badge>{submission.reviewStatus}</Badge>
                  </div>
                  <p className="text-sm text-[var(--color-fg-muted)]">
                    Submitted {new Date(submission.submittedAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-[var(--color-fg-muted)]">
                    Profile completion at submit: {submission.profileCompletionAtSubmit}%
                  </p>
                  {submission.documentIds.length > 0 && (
                    <p className="text-sm text-[var(--color-fg-muted)]">
                      {submission.documentIds.length} attached document
                      {submission.documentIds.length === 1 ? "" : "s"}
                    </p>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
