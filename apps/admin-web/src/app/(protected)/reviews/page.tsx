"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, LoadingState, Badge } from "@pitchdeck/ui";
import type { ReviewAssignmentDto } from "@pitchdeck/contracts";
import { apiFetch } from "@/lib/api-client";

export default function ReviewerWorkspacePage() {
  const [assignments, setAssignments] = useState<ReviewAssignmentDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        setAssignments(await apiFetch<ReviewAssignmentDto[]>("/reviewer/assignments"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <LoadingState label="Loading assignments..." />;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">My review assignments</h1>
      <div className="flex flex-col gap-3">
        {assignments.map((a) => (
          <Card key={a.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <Link href={`/reviews/${a.id}`} className="font-medium hover:underline">
                  {a.pitchTitle}
                </Link>
                <div className="mt-1 flex gap-2">
                  <Badge>{a.status}</Badge>
                  <Badge variant="outline">{a.conflictStatus}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
