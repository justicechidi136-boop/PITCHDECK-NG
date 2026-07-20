"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, LoadingState, Badge, Button } from "@pitchdeck/ui";
import { apiFetch } from "@/lib/api-client";

interface AdminPitchDetail {
  title: string;
  status: string;
  owner?: { email?: string };
}

export default function AdminPitchDetailPage() {
  const params = useParams<{ pitchId: string }>();
  const [pitch, setPitch] = useState<AdminPitchDetail | null>(null);

  useEffect(() => {
    void apiFetch<AdminPitchDetail>(`/admin/pitches/${params.pitchId}`).then(setPitch);
  }, [params.pitchId]);

  if (!pitch) {
    return <LoadingState label="Loading pitch..." />;
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">{pitch.title}</h1>
      <Badge>{pitch.status}</Badge>
      <Card className="mt-4">
        <CardContent className="space-y-4 p-6">
          <p className="text-sm text-[var(--color-fg-muted)]">Owner: {pitch.owner?.email ?? ""}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void apiFetch(`/admin/pitches/${params.pitchId}/start-review`, { method: "POST", body: "{}" });
            }}
          >
            <Button type="submit">Start review</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
