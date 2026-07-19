import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/admin-login-form";

export const metadata: Metadata = { title: "Admin Sign In" };

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-muted)] px-4">
      <div className="w-full max-w-md">
        <AdminLoginForm />
      </div>
    </div>
  );
}
