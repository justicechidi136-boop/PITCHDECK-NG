"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, LoadingState, Badge } from "@pitchdeck/ui";
import { apiFetch } from "@/lib/api-client";

interface OrgListItem {
  id: string;
  displayName: string;
  verificationStatus: string;
  stateCode?: string;
}

export default function AdminSponsorOrganizationsPage() {
  const [items, setItems] = useState<OrgListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetch<{ items: OrgListItem[] }>("/admin/sponsor-organizations");
        setItems(data.items);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <LoadingState label="Loading organisations..." />;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Sponsor verification</h1>
      <div className="flex flex-col gap-3">
        {items.map((org) => (
          <Card key={org.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <Link href={`/sponsor-organizations/${org.id}`} className="font-medium hover:underline">
                  {org.displayName}
                </Link>
                <Badge className="mt-1">{org.verificationStatus}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
