"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  LoadingState,
} from "@pitchdeck/ui";
import type { SessionDto } from "@pitchdeck/contracts";
import { apiFetch, fetchCsrfToken } from "@/lib/api-client";

export default function AccountSecurityPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadSessions() {
    const data = await apiFetch<SessionDto[]>("/auth/sessions");
    setSessions(data);
  }

  useEffect(() => {
    void (async () => {
      try {
        await loadSessions();
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function revokeSession(sessionId: string) {
    await fetchCsrfToken();
    await apiFetch(`/auth/sessions/${sessionId}`, { method: "DELETE" });
    await loadSessions();
  }

  async function logoutAll() {
    await fetchCsrfToken();
    await apiFetch("/auth/logout-all", { method: "POST" });
    await loadSessions();
  }

  async function logout() {
    await fetchCsrfToken();
    await apiFetch("/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <LoadingState label="Loading security settings..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Active sessions</CardTitle>
          <CardDescription>Devices where you are signed in.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between rounded-md border border-[var(--color-border)] p-4"
            >
              <div>
                <p className="font-medium">
                  {session.deviceDescription ?? "Unknown device"}
                  {session.isCurrent ? " (current)" : ""}
                </p>
                <p className="text-sm text-[var(--color-fg-muted)]">
                  {session.ipAddress ?? "Unknown IP"} ·{" "}
                  {new Date(session.createdAt).toLocaleDateString()}
                </p>
              </div>
              {!session.isCurrent ? (
                <Button variant="outline" size="sm" onClick={() => void revokeSession(session.id)}>
                  Revoke
                </Button>
              ) : null}
            </div>
          ))}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => void logoutAll()}>
              Sign out other devices
            </Button>
            <Button variant="secondary" onClick={() => void logout()}>
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
