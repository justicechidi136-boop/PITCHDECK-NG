"use client";

import { useState, type SubmitEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@pitchdeck/ui";
import { apiFetch, fetchCsrfToken, ApiClientError } from "@/lib/api-client";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    const form = new FormData(e.currentTarget);

    try {
      await fetchCsrfToken();
      await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      router.push("/account");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Access your PitchDeck Nigeria account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          <Input name="email" label="Email" type="email" required autoComplete="email" />
          <Input
            name="password"
            label="Password"
            type="password"
            required
            autoComplete="current-password"
          />
          {error ? (
            <p className="text-sm text-red-500" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" isLoading={loading} className="w-full">
            Sign in
          </Button>
          <div className="flex flex-col gap-2 text-center text-sm text-[var(--color-fg-muted)]">
            <Link href="/forgot-password" className="text-[var(--color-brand-primary)] hover:underline">
              Forgot password?
            </Link>
            <p>
              New here?{" "}
              <Link href="/register" className="text-[var(--color-brand-primary)] hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
