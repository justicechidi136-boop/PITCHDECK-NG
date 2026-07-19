import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from "@pitchdeck/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register",
};

export default function RegisterPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Create Account</CardTitle>
          <CardDescription>
            Registration flows for innovators and sponsors will be implemented in a
            dedicated auth milestone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Registration not configured"
            description="This placeholder route marks where account creation will be integrated."
          />
        </CardContent>
      </Card>
    </div>
  );
}
