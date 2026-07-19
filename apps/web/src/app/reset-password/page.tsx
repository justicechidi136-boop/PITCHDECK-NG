"use client";

import { useState, type SubmitEvent, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Input, LoadingState } from "@pitchdeck/ui";
import { apiFetch, fetchCsrfToken, ApiClientError } from "@/lib/api-client";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await fetchCsrfToken();
      await apiFetch("/auth/password/reset", {
        method: "POST",
        body: JSON.stringify({ token, password: form.get("password") }),
      });
      router.push("/login?reset=true");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-red-500">Invalid reset link.</p>
          <Link href="/forgot-password" className="mt-4 inline-block text-sm text-[var(--color-brand-primary)]">
            Request a new link
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>Choose a new password (minimum 12 characters).</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          <Input name="password" label="New password" type="password" required autoComplete="new-password" />
          {error ? <p className="text-sm text-red-500" role="alert">{error}</p> : null}
          <Button type="submit" isLoading={loading} className="w-full">
            Reset password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <Suspense fallback={<LoadingState label="Loading..." />}>
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
