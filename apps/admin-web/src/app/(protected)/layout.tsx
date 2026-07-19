import { SecureAdminLayout } from "@/components/secure-admin-layout";

/**
 * Protected route group placeholder.
 * Authentication and authorization middleware will guard this segment in a future milestone.
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SecureAdminLayout>{children}</SecureAdminLayout>;
}
