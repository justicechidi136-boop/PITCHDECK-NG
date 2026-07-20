"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent, LoadingState, Badge } from "@pitchdeck/ui";
import type { SponsorOrganizationDto } from "@pitchdeck/contracts";
import { apiFetch } from "@/lib/api-client";

export default function OrganizationDetailPage() {
  const params = useParams<{ organizationId: string }>();
  const router = useRouter();
  const [org, setOrg] = useState<SponsorOrganizationDto | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setOrg(await apiFetch<SponsorOrganizationDto>(`/sponsor-organizations/${params.organizationId}`));
      } catch {
        router.push("/login");
      }
    })();
  }, [params.organizationId, router]);

  if (!org) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <LoadingState label="Loading..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-2 text-2xl font-semibold">{org.displayName}</h1>
      <Badge>{org.verificationStatus}</Badge>
      <Card className="mt-6">
        <CardContent className="flex flex-col gap-3 p-6">
          <p className="whitespace-pre-wrap text-sm">{org.description}</p>
          <div className="flex gap-3">
            <Link href={`/sponsor/organizations/${org.id}/verification`}>
              <Button variant="outline">Verification</Button>
            </Link>
            <Link href={`/sponsor/organizations/${org.id}/members`}>
              <Button variant="outline">Members</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
