"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  LoadingState,
  Textarea,
} from "@pitchdeck/ui";
import type { InnovatorProfileDto, CompletenessResult } from "@pitchdeck/contracts";
import { apiFetch } from "@/lib/api-client";

export default function InnovatorProfilePage() {
  const router = useRouter();
  const [completeness, setCompleteness] = useState<CompletenessResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    headline: "",
    biography: "",
    organizationName: "",
    isIndependent: false,
  });

  useEffect(() => {
    void (async () => {
      try {
        const [p, c] = await Promise.all([
          apiFetch<InnovatorProfileDto | null>("/innovator/profile"),
          apiFetch<CompletenessResult>("/innovator/profile/completeness"),
        ]);
        if (p) {
          setForm({
            displayName: p.displayName ?? "",
            headline: p.headline ?? "",
            biography: p.biography ?? "",
            organizationName: p.organizationName ?? "",
            isIndependent: p.isIndependent,
          });
        }
        setCompleteness(c);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await apiFetch<InnovatorProfileDto>("/innovator/profile", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      setForm({
        displayName: updated.displayName ?? "",
        headline: updated.headline ?? "",
        biography: updated.biography ?? "",
        organizationName: updated.organizationName ?? "",
        isIndependent: updated.isIndependent,
      });
      const c = await apiFetch<CompletenessResult>("/innovator/profile/completeness");
      setCompleteness(c);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <LoadingState label="Loading profile..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Innovator profile</h1>
        {completeness && (
          <span className="text-sm text-[var(--color-fg-muted)]">
            {completeness.completionPercent}% complete
          </span>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Professional profile</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              value={form.displayName}
              onChange={(e) => { setForm({ ...form, displayName: e.target.value }); }}
            />
          </div>
          <div>
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              value={form.headline}
              onChange={(e) => { setForm({ ...form, headline: e.target.value }); }}
            />
          </div>
          <div>
            <Label htmlFor="biography">Biography</Label>
            <Textarea
              id="biography"
              rows={5}
              value={form.biography}
              onChange={(e) => { setForm({ ...form, biography: e.target.value }); }}
            />
          </div>
          <div>
            <Label htmlFor="organizationName">Organisation / institution</Label>
            <Input
              id="organizationName"
              value={form.organizationName}
              onChange={(e) => { setForm({ ...form, organizationName: e.target.value }); }}
              disabled={form.isIndependent}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isIndependent}
              onChange={(e) => { setForm({ ...form, isIndependent: e.target.checked }); }}
            />
            Independent innovator
          </label>
          {completeness && completeness.blockingIssues.length > 0 && (
            <ul className="text-sm text-amber-700">
              {completeness.blockingIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}
          <div className="flex gap-3">
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving..." : "Save profile"}
            </Button>
            <Link href="/innovator/pitches">
              <Button variant="outline">My pitches</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
