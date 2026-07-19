"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  CardContent,
  LoadingState,
  Badge,
  Button,
} from "@pitchdeck/ui";
import type { AdminUserListItem } from "@pitchdeck/contracts";
import { AccountStatus } from "@pitchdeck/contracts";
import { apiFetch } from "@/lib/api-client";

interface UsersResponse {
  items: AdminUserListItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export default function AdminUsersPage() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void (async () => {
      try {
        const result = await apiFetch<UsersResponse>("/admin/users?page=1&pageSize=50");
        setData(result);
      } catch {
        setError("Unable to load users");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <LoadingState label="Loading users..." />;
  }

  if (error || !data) {
    return <p className="text-red-500">{error ?? "Failed to load"}</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage platform users and role assignments."
      />
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left">
                  <th className="p-4 font-medium">Name</th>
                  <th className="p-4 font-medium">Email</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Roles</th>
                  <th className="p-4 font-medium" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((user) => (
                  <tr key={user.id} className="border-b border-[var(--color-border)]">
                    <td className="p-4">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="p-4">{user.email}</td>
                    <td className="p-4">
                      <Badge variant={user.accountStatus === AccountStatus.ACTIVE ? "success" : "warning"}>
                        {user.accountStatus}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((r) => (
                          <Badge key={`${user.id}-${r.role}`} variant="outline">
                            {r.role}
                            {r.stateCode ? ` (${r.stateCode})` : ""}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <Link href={`/users/${user.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
