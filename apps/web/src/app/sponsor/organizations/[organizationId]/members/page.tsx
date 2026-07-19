"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  LoadingState,
  Badge,
  Select,
} from "@pitchdeck/ui";
import type { SponsorMembershipDto } from "@pitchdeck/contracts";
import { SponsorMembershipRole } from "@pitchdeck/contracts";
import { apiFetch } from "@/lib/api-client";

export default function OrganizationMembersPage() {
  const params = useParams<{ organizationId: string }>();
  const router = useRouter();
  const [members, setMembers] = useState<SponsorMembershipDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<SponsorMembershipRole>(SponsorMembershipRole.MEMBER);
  const [saving, setSaving] = useState(false);

  const loadMembers = useCallback(async () => {
    const list = await apiFetch<SponsorMembershipDto[]>(
      `/sponsor-organizations/${params.organizationId}/members`,
    );
    setMembers(list);
  }, [params.organizationId]);

  useEffect(() => {
    void (async () => {
      try {
        await loadMembers();
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadMembers, router]);

  async function handleInvite() {
    setSaving(true);
    try {
      await apiFetch(`/sponsor-organizations/${params.organizationId}/members`, {
        method: "POST",
        body: JSON.stringify({ email, role }),
      });
      setEmail("");
      await loadMembers();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <LoadingState label="Loading members..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Organisation members</h1>
        <Link href={`/sponsor/organizations/${params.organizationId}`}>
          <Button variant="outline">Back</Button>
        </Link>
      </div>
      <Card className="mb-6">
        <CardContent className="flex flex-col gap-4 p-6">
          <h2 className="font-medium">Invite member</h2>
          <div>
            <Label htmlFor="email">User email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); }}
            />
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Select
              id="role"
              value={role}
              onChange={(e) => { setRole(e.target.value as SponsorMembershipRole); }}
              options={[
                { value: SponsorMembershipRole.MEMBER, label: "Member" },
                { value: SponsorMembershipRole.ADMIN, label: "Admin" },
                { value: SponsorMembershipRole.OWNER, label: "Owner" },
              ]}
            />
          </div>
          <Button onClick={() => void handleInvite()} disabled={saving || !email}>
            {saving ? "Inviting..." : "Add member"}
          </Button>
        </CardContent>
      </Card>
      <ul className="flex flex-col gap-3">
        {members.map((member) => (
          <li key={member.id}>
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{member.userName}</p>
                  <p className="text-sm text-[var(--color-fg-muted)]">{member.userEmail}</p>
                </div>
                <Badge>{member.role}</Badge>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
