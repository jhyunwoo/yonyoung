import { ReactNode } from "react";
import { serverAuthTool } from "../../../lib/auth-server-tool";
import AdminShell from "./components/admin-shell";

export default async function AdminAuthGuardLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const session = await serverAuthTool.requireAdminPageAccess();

  return <AdminShell session={session}>{children}</AdminShell>;
}
