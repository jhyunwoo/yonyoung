import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { serverAuthTool } from "@/features/auth/server/auth-guard";
import { DASHBOARD_PATH } from "@/features/auth/model/auth-shared";

export default async function DashboardRouteLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const session = await serverAuthTool.requireSession();
  const redirectPath = await serverAuthTool.resolveAdminLandingPath(session);

  if (redirectPath !== DASHBOARD_PATH) {
    redirect(redirectPath);
  }

  return <>{children}</>;
}
