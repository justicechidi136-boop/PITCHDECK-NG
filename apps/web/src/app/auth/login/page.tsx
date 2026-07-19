import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from "@pitchdeck/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>
            Authentication integration will be added in a future release. This route
            is reserved for secure sign-in flows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Auth not configured"
            description="No authentication provider is connected yet. Do not implement placeholder login logic here."
          />
        </CardContent>
      </Card>
    </div>
  );
}
