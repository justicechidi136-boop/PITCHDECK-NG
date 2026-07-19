"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  LoadingState,
  Badge,
} from "@pitchdeck/ui";
import type { AuthUser } from "@pitchdeck/contracts";
import { AccountStatus } from "@pitchdeck/contracts";
import { apiFetch } from "@/lib/api-client";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const me = await apiFetch<AuthUser>("/auth/me");
        setUser(me);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <LoadingState label="Loading account..." />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>My account</CardTitle>
          <CardDescription>Manage your PitchDeck Nigeria profile.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="text-sm text-[var(--color-fg-muted)]">Name</p>
            <p className="font-medium">
              {user.firstName} {user.lastName}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--color-fg-muted)]">Email</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--color-fg-muted)]">Status</p>
            <Badge variant={user.accountStatus === AccountStatus.ACTIVE ? "success" : "warning"}>
              {user.accountStatus.replace("_", " ")}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-[var(--color-fg-muted)]">Roles</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {user.roles.map((r) => (
                <Badge key={`${r.role}-${r.scopeType}`}>{r.role}</Badge>
              ))}
            </div>
          </div>
          <Link href="/account/security">
            <Button variant="outline">Security settings</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
