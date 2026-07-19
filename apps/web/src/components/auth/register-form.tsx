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
  Select,
} from "@pitchdeck/ui";
import { RoleType, NIGERIAN_STATE_OPTIONS } from "@pitchdeck/contracts";
import { apiFetch, fetchCsrfToken, ApiClientError } from "@/lib/api-client";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const acceptedTerms = form.get("acceptedTerms") === "on";

    if (!acceptedTerms) {
      setError("You must accept the terms of service");
      setLoading(false);
      return;
    }

    try {
      await fetchCsrfToken();
      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          role: form.get("role"),
          stateCode: form.get("stateCode"),
          acceptedTerms: true,
        }),
      });
      router.push("/verify-email?registered=true");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Join PitchDeck Nigeria as an innovator or sponsor.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input name="firstName" label="First name" required autoComplete="given-name" />
            <Input name="lastName" label="Last name" required autoComplete="family-name" />
          </div>
          <Input name="email" label="Email" type="email" required autoComplete="email" />
          <Input
            name="password"
            label="Password"
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
            aria-describedby="password-hint"
          />
          <p id="password-hint" className="text-sm text-[var(--color-fg-muted)]">
            Minimum 12 characters.
          </p>
          <Select
            name="stateCode"
            label="State"
            required
            defaultValue=""
            options={[
              { value: "", label: "Select your state" },
              ...NIGERIAN_STATE_OPTIONS.map((state) => ({
                value: state.code,
                label: state.name,
              })),
            ]}
          />
          <Select
            name="role"
            label="I am a"
            required
            options={[
              { value: RoleType.INNOVATOR, label: "Innovator" },
              { value: RoleType.SPONSOR, label: "Sponsor" },
            ]}
          />
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="acceptedTerms"
              required
              className="mt-1 h-4 w-4 rounded border-[var(--color-border)]"
            />
            <span>
              I agree to the{" "}
              <Link href="/terms" className="text-[var(--color-brand-primary)] hover:underline">
                terms of service
              </Link>
              .
            </span>
          </label>
          {error ? (
            <p className="text-sm text-red-500" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" isLoading={loading} className="w-full">
            Create account
          </Button>
          <p className="text-center text-sm text-[var(--color-fg-muted)]">
            Already have an account?{" "}
            <Link href="/login" className="text-[var(--color-brand-primary)] hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
