"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  LoadingState,
  Badge,
  Button,
  Select,
  Input,
} from "@pitchdeck/ui";
import {
  RoleType,
  ScopeType,
  AccountStatus,
  type AdminUserListItem,
  type AdminAssignRoleRequest,
} from "@pitchdeck/contracts";
import { apiFetch, fetchCsrfToken } from "@/lib/api-client";

export default function AdminUserDetailPage() {
  const params = useParams<{ userId: string }>();
  const [user, setUser] = useState<AdminUserListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<RoleType>(RoleType.REVIEWER);
  const [stateCode, setStateCode] = useState("LA");

  async function loadUser() {
    const data = await apiFetch<AdminUserListItem>(`/admin/users/${params.userId}`);
    setUser(data);
  }

  useEffect(() => {
    void (async () => {
      try {
        await loadUser();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load on userId change only
  }, [params.userId]);

  async function assignRole() {
    await fetchCsrfToken();
    const payload: AdminAssignRoleRequest = {
      role,
      scopeType:
        role === RoleType.STATE_ADMIN
          ? ScopeType.STATE
          : role === RoleType.NATIONAL_ADMIN
            ? ScopeType.COUNTRY
            : ScopeType.GLOBAL,
      ...(role === RoleType.NATIONAL_ADMIN ? { countryCode: "NG" } : {}),
      ...(role === RoleType.STATE_ADMIN ? { stateCode } : {}),
    };
    await apiFetch(`/admin/users/${params.userId}/roles`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await loadUser();
  }

  async function updateStatus(status: AccountStatus.ACTIVE | AccountStatus.SUSPENDED) {
    await fetchCsrfToken();
    await apiFetch(`/admin/users/${params.userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ accountStatus: status }),
    });
    await loadUser();
  }

  if (loading || !user) {
    return <LoadingState label="Loading user..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${user.firstName} ${user.lastName}`}
        description={user.email}
      />
      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-[var(--color-fg-muted)]">Status</p>
            <Badge variant={user.accountStatus === AccountStatus.ACTIVE ? "success" : "warning"}>
              {user.accountStatus}
            </Badge>
          </div>
          <div>
            <p className="mb-2 text-sm text-[var(--color-fg-muted)]">Roles</p>
            <div className="flex flex-wrap gap-2">
              {user.roles.map((r) => (
                <Badge key={`${r.role}-${r.stateCode ?? "global"}`} variant="outline">
                  {r.role}
                  {r.stateCode ? ` · ${r.stateCode}` : ""}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void updateStatus(AccountStatus.ACTIVE)}>
              Activate
            </Button>
            <Button variant="secondary" onClick={() => void updateStatus(AccountStatus.SUSPENDED)}>
              Suspend
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Assign role</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Select
            label="Role"
            value={role}
            onChange={(e) => {
              setRole(e.target.value as RoleType);
            }}
            options={Object.values(RoleType).map((r) => ({ value: r, label: r }))}
          />
          {role === RoleType.STATE_ADMIN ? (
            <Input
              label="State code"
              value={stateCode}
              onChange={(e) => {
                setStateCode(e.target.value.toUpperCase());
              }}
            />
          ) : null}
          <Button onClick={() => void assignRole()}>Assign role</Button>
        </CardContent>
      </Card>
    </div>
  );
}
