"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Input, LoadingState } from "@pitchdeck/ui";
import { apiFetch, fetchCsrfToken, ApiClientError } from "@/lib/api-client";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const registered = searchParams.get("registered");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      setLoading(true);
      try {
        await fetchCsrfToken();
        await apiFetch("/auth/email-verification/confirm", {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        setMessage("Email verified successfully. You can now sign in.");
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : "Verification failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function resend() {
    setError(undefined);
    setMessage(undefined);
    setLoading(true);
    try {
      await fetchCsrfToken();
      await apiFetch("/auth/email-verification/request", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMessage("If an account exists, a verification email has been sent.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  if (token && loading) {
    return <LoadingState label="Verifying your email..." />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify your email</CardTitle>
        <CardDescription>
          {registered
            ? "Check your inbox for a verification link, or resend below."
            : "Enter your email to resend the verification link."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {message ? <p className="text-sm text-[var(--color-brand-primary)]">{message}</p> : null}
        {error ? <p className="text-sm text-red-500" role="alert">{error}</p> : null}
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
        />
        <Button onClick={() => void resend()} isLoading={loading}>
          Resend verification email
        </Button>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <Suspense fallback={<LoadingState label="Loading..." />}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
