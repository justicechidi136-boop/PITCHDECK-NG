"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, Input, Label } from "@pitchdeck/ui";
import { apiFetch } from "@/lib/api-client";

export default function NewPitchPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      const pitch = await apiFetch<{ id: string }>("/pitches", {
        method: "POST",
        body: JSON.stringify({ title }),
      });
      router.push(`/innovator/pitches/${pitch.id}/edit`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <h1 className="text-xl font-semibold">Create pitch draft</h1>
          <div>
            <Label htmlFor="title">Pitch title</Label>
            <Input id="title" value={title} onChange={(e) => { setTitle(e.target.value); }} />
          </div>
          <Button onClick={() => void handleCreate()} disabled={loading || title.length < 3}>
            Create draft
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
