"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, Input, Label } from "@pitchdeck/ui";
import { OrganizationType } from "@pitchdeck/contracts";
import { apiFetch } from "@/lib/api-client";

export default function NewOrganizationPage() {
  const router = useRouter();
  const [legalName, setLegalName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      const org = await apiFetch<{ id: string }>("/sponsor-organizations", {
        method: "POST",
        body: JSON.stringify({
          legalName,
          displayName,
          organizationType: OrganizationType.CORPORATE,
        }),
      });
      router.push(`/sponsor/organizations/${org.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <h1 className="text-xl font-semibold">Create organisation</h1>
          <div>
            <Label htmlFor="legalName">Legal name</Label>
            <Input id="legalName" value={legalName} onChange={(e) => { setLegalName(e.target.value); }} />
          </div>
          <div>
            <Label htmlFor="displayName">Display name</Label>
            <Input id="displayName" value={displayName} onChange={(e) => { setDisplayName(e.target.value); }} />
          </div>
          <Button onClick={() => void handleCreate()} disabled={loading}>
            Create
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
