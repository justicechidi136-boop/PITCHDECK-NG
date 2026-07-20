"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, LoadingState, Badge, Button } from "@pitchdeck/ui";
import { apiFetch } from "@/lib/api-client";

interface AdminOrgDetail {
  displayName: string;
  verificationStatus: string;
}

export default function AdminSponsorOrgDetailPage() {
  const params = useParams<{ organizationId: string }>();
  const [org, setOrg] = useState<AdminOrgDetail | null>(null);

  useEffect(() => {
    void apiFetch<AdminOrgDetail>(`/admin/sponsor-organizations/${params.organizationId}`).then(setOrg);
  }, [params.organizationId]);

  if (!org) {
    return <LoadingState label="Loading organisation..." />;
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">{org.displayName}</h1>
      <Badge>{org.verificationStatus}</Badge>
      <Card className="mt-4">
        <CardContent className="flex gap-3 p-6">
          <Button
            onClick={() =>
              void apiFetch(`/admin/sponsor-organizations/${params.organizationId}/verify`, {
                method: "POST",
                body: "{}",
              })
            }
          >
            Verify
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              void apiFetch(`/admin/sponsor-organizations/${params.organizationId}/reject`, {
                method: "POST",
                body: JSON.stringify({ reason: "Incomplete documentation" }),
              })
            }
          >
            Reject
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
