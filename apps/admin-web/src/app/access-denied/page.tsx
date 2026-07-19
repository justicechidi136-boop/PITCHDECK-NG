import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from "@pitchdeck/ui";
import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>
            You do not have permission to access the admin console.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login">
            <Button variant="outline">Back to sign in</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
