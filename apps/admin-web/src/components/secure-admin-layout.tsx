import { AdminHeader } from "@/components/admin-header";
import { AdminSidebar } from "@/components/admin-sidebar";

export function SecureAdminLayout({
  children,
  isReviewerOnly = false,
}: {
  children: React.ReactNode;
  isReviewerOnly?: boolean;
}) {
  return (
    <div className="flex min-h-screen">
      {!isReviewerOnly && <AdminSidebar />}
      <div className="flex min-h-screen flex-1 flex-col">
        <AdminHeader />
        <div className="flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}
