"use client";

import { useState, type SubmitEvent } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Input } from "@pitchdeck/ui";
import { apiFetch, fetchCsrfToken, ApiClientError } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    setMessage(undefined);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await fetchCsrfToken();
      await apiFetch("/auth/password/forgot", {
        method: "POST",
        body: JSON.stringify({ email: form.get("email") }),
      });
      setMessage("If an account exists, password reset instructions have been sent.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Forgot password</CardTitle>
          <CardDescription>We will send reset instructions if the email is registered.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
            <Input name="email" label="Email" type="email" required />
            {message ? <p className="text-sm text-[var(--color-brand-primary)]">{message}</p> : null}
            {error ? <p className="text-sm text-red-500" role="alert">{error}</p> : null}
            <Button type="submit" isLoading={loading} className="w-full">
              Send reset link
            </Button>
            <Link href="/login" className="text-center text-sm text-[var(--color-brand-primary)] hover:underline">
              Back to sign in
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
