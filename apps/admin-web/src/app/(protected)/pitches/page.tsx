"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, LoadingState, Badge } from "@pitchdeck/ui";
import { apiFetch } from "@/lib/api-client";

interface PitchListItem {
  id: string;
  title: string;
  status: string;
  stateCode?: string;
  ownerEmail: string;
  submittedAt?: string;
}

export default function AdminPitchesPage() {
  const [items, setItems] = useState<PitchListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetch<{ items: PitchListItem[] }>("/admin/pitches");
        setItems(data.items);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <LoadingState label="Loading pitches..." />;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Pitch triage</h1>
      <div className="flex flex-col gap-3">
        {items.map((pitch) => (
          <Card key={pitch.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <Link href={`/pitches/${pitch.id}`} className="font-medium hover:underline">
                  {pitch.title}
                </Link>
                <p className="text-sm text-[var(--color-fg-muted)]">{pitch.ownerEmail}</p>
                <div className="mt-1 flex gap-2">
                  <Badge>{pitch.status}</Badge>
                  {pitch.stateCode && <Badge variant="outline">{pitch.stateCode}</Badge>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
