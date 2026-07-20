"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent, LoadingState, Badge } from "@pitchdeck/ui";
import type { PitchDto } from "@pitchdeck/contracts";
import { apiFetch } from "@/lib/api-client";

export default function InnovatorPitchesPage() {
  const router = useRouter();
  const [pitches, setPitches] = useState<PitchDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetch<PitchDto[]>("/pitches");
        setPitches(data);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <LoadingState label="Loading pitches..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My pitches</h1>
        <Link href="/innovator/pitches/new">
          <Button>New pitch</Button>
        </Link>
      </div>
      <div className="flex flex-col gap-4">
        {pitches.length === 0 && (
          <p className="text-[var(--color-fg-muted)]">No pitches yet. Create your first draft.</p>
        )}
        {pitches.map((pitch) => (
          <Card key={pitch.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{pitch.title}</p>
                <Badge className="mt-1">{pitch.status}</Badge>
              </div>
              <Link href={`/innovator/pitches/${pitch.id}/edit`}>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
