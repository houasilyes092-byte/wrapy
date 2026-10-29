import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  if (!admin) {
    redirect("/login?redirect=/admin");
  }

  return <AdminShell adminName={admin.name}>{children}</AdminShell>;
}
