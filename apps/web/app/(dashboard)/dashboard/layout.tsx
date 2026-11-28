import type { ReactNode } from "react";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";

export default async function DashboardRouteLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  await serverAuthGuard.requireAdminPageAccess();

  return <>{children}</>;
}
