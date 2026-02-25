import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { serverAuthTool } from "../../../lib/auth-server-tool";
import { DASHBOARD_PATH } from "../../../lib/auth-shared";

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
