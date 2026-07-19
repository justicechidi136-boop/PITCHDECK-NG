"use client";

import { useState, type SubmitEvent } from "react";
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
import { RoleType, type AuthUser } from "@pitchdeck/contracts";

export function AdminLoginForm() {
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
      const { user } = await apiFetch<{ user: AuthUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const isAdmin = user.roles.some((r) =>
        [RoleType.SUPER_ADMIN, RoleType.NATIONAL_ADMIN, RoleType.STATE_ADMIN].includes(
          r.role,
        ),
      );
      if (!isAdmin) {
        setError("Admin access required");
        await apiFetch("/auth/logout", { method: "POST" });
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin sign in</CardTitle>
        <CardDescription>PitchDeck Nigeria administration console.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          <Input name="email" label="Email" type="email" required autoComplete="email" />
          <Input name="password" label="Password" type="password" required autoComplete="current-password" />
          {error ? <p className="text-sm text-red-500" role="alert">{error}</p> : null}
          <Button type="submit" isLoading={loading} className="w-full">
            Sign in
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
