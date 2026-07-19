"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent, LoadingState, Badge } from "@pitchdeck/ui";
import type { SponsorOrganizationDto } from "@pitchdeck/contracts";
import { apiFetch } from "@/lib/api-client";

export default function SponsorOrganizationsPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<SponsorOrganizationDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        setOrgs(await apiFetch<SponsorOrganizationDto[]>("/sponsor-organizations"));
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
        <LoadingState label="Loading organisations..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sponsor organisations</h1>
        <Link href="/sponsor/organizations/new">
          <Button>Create organisation</Button>
        </Link>
      </div>
      <div className="flex flex-col gap-4">
        {orgs.map((org) => (
          <Card key={org.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{org.displayName}</p>
                <Badge className="mt-1">{org.verificationStatus}</Badge>
              </div>
              <Link href={`/sponsor/organizations/${org.id}`}>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
