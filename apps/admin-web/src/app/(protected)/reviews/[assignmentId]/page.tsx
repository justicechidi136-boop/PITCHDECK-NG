"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, LoadingState, Badge, Button } from "@pitchdeck/ui";
import { apiFetch } from "@/lib/api-client";

interface ReviewAssignmentDetail {
  assignment: { status: string };
  pitch: { title: string };
}

export default function ReviewAssignmentPage() {
  const params = useParams<{ assignmentId: string }>();
  const [data, setData] = useState<ReviewAssignmentDetail | null>(null);

  useEffect(() => {
    void apiFetch<ReviewAssignmentDetail>(`/reviewer/assignments/${params.assignmentId}`).then(setData);
  }, [params.assignmentId]);

  if (!data) {
    return <LoadingState label="Loading assignment..." />;
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">{data.pitch.title}</h1>
      <Badge>{data.assignment.status}</Badge>
      <Card className="mt-4">
        <CardContent className="flex flex-col gap-3 p-6">
          <Button
            onClick={() =>
              void apiFetch(`/reviewer/assignments/${params.assignmentId}/conflict`, {
                method: "POST",
                body: JSON.stringify({ status: "NO_CONFLICT" }),
              })
            }
          >
            Declare no conflict
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
