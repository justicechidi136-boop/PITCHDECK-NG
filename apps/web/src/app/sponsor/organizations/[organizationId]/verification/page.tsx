"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, CardContent, LoadingState } from "@pitchdeck/ui";
import { apiFetch } from "@/lib/api-client";

export default function VerificationPage() {
  const params = useParams<{ organizationId: string }>();
  const router = useRouter();
  const [verification, setVerification] = useState<{
    status: string;
    events: Array<{ toStatus: string; reason?: string; createdAt: string }>;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setVerification(
          await apiFetch(`/sponsor-organizations/${params.organizationId}/verification`),
        );
      } catch {
        router.push("/login");
      }
    })();
  }, [params.organizationId, router]);

  async function submitVerification() {
    await apiFetch(`/sponsor-organizations/${params.organizationId}/verification/submit`, {
      method: "POST",
      body: "{}",
    });
    setVerification(
      await apiFetch(`/sponsor-organizations/${params.organizationId}/verification`),
    );
  }

  if (!verification) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <LoadingState label="Loading verification..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-4 text-2xl font-semibold">Verification</h1>
      <Card>
        <CardContent className="p-6">
          <p className="mb-4">Status: {verification.status}</p>
          <Button onClick={() => void submitVerification()}>Submit for verification</Button>
          <ul className="mt-6 space-y-2 text-sm text-[var(--color-fg-muted)]">
            {verification.events.map((e, i) => (
              <li key={i}>
                {e.toStatus} — {e.reason ?? "—"} — {new Date(e.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
