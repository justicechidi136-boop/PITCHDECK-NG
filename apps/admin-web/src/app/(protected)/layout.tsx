import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getServerUser } from "@/lib/api-client";
import { RoleType } from "@pitchdeck/contracts";

const ADMIN_ROLES = [RoleType.SUPER_ADMIN, RoleType.NATIONAL_ADMIN, RoleType.STATE_ADMIN];
const REVIEWER_ROLE = RoleType.REVIEWER;

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const cookie = headersList.get("cookie") ?? undefined;
  const user = (await getServerUser(cookie)) as {
    roles: Array<{ role: string }>;
  } | null;

  if (!user) {
    redirect("/login");
  }

  const isAdmin = user.roles.some((r) => ADMIN_ROLES.includes(r.role as RoleType));
  const isReviewer = user.roles.some((r) => r.role === (REVIEWER_ROLE as string));

  if (!isAdmin && !isReviewer) {
    redirect("/access-denied");
  }

  const { SecureAdminLayout } = await import("@/components/secure-admin-layout");
  return <SecureAdminLayout isReviewerOnly={!isAdmin && isReviewer}>{children}</SecureAdminLayout>;
}
