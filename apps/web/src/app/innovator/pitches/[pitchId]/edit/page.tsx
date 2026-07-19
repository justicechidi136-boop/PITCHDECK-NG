"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  Label,
  LoadingState,
  Textarea,
  Badge,
} from "@pitchdeck/ui";
import type { PitchDto, CompletenessResult } from "@pitchdeck/contracts";
import { apiFetch } from "@/lib/api-client";

export default function EditPitchPage() {
  const params = useParams<{ pitchId: string }>();
  const router = useRouter();
  const [pitch, setPitch] = useState<PitchDto | null>(null);
  const [completeness, setCompleteness] = useState<CompletenessResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [p, c] = await Promise.all([
          apiFetch<PitchDto>(`/pitches/${params.pitchId}`),
          apiFetch<CompletenessResult>(`/pitches/${params.pitchId}/completeness`),
        ]);
        setPitch(p);
        setCompleteness(c);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [params.pitchId, router]);

  async function saveField(field: string, value: string | boolean) {
    if (!pitch) return;
    setSaving(true);
    setConflict(false);
    try {
      const updated = await apiFetch<PitchDto>(`/pitches/${pitch.id}`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: value, lockVersion: pitch.lockVersion }),
      });
      setPitch(updated);
      const c = await apiFetch<CompletenessResult>(`/pitches/${pitch.id}/completeness`);
      setCompleteness(c);
    } catch (err) {
      if (err instanceof Error && err.message.includes("conflict")) {
        setConflict(true);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!pitch) return;
    await apiFetch(`/pitches/${pitch.id}/submit`, { method: "POST", body: "{}" });
    router.push(`/innovator/pitches/${pitch.id}`);
  }

  if (loading || !pitch) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <LoadingState label="Loading pitch..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{pitch.title}</h1>
        <Badge>{pitch.status}</Badge>
      </div>
      {conflict && (
        <p className="mb-4 rounded-md bg-amber-100 p-3 text-sm text-amber-900">
          This pitch was updated elsewhere. Reload the page before saving again.
        </p>
      )}
      {completeness && (
        <p className="mb-4 text-sm text-[var(--color-fg-muted)]">
          Completeness: {completeness.completionPercent}%
        </p>
      )}
      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <div>
            <Label htmlFor="summary">Short summary</Label>
            <Textarea
              id="summary"
              defaultValue={pitch.shortSummary ?? ""}
              onBlur={(e) => void saveField("shortSummary", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="problem">Problem statement</Label>
            <Textarea
              id="problem"
              rows={4}
              defaultValue={pitch.problemStatement ?? ""}
              onBlur={(e) => void saveField("problemStatement", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="solution">Proposed solution</Label>
            <Textarea
              id="solution"
              rows={4}
              defaultValue={pitch.proposedSolution ?? ""}
              onBlur={(e) => void saveField("proposedSolution", e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              defaultChecked={pitch.termsAccepted}
              onChange={(e) => void saveField("termsAccepted", e.target.checked)}
            />
            I confirm this pitch is accurate
          </label>
          <div className="flex gap-3">
            <Button onClick={() => void handleSubmit()} disabled={saving}>
              Submit pitch
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
