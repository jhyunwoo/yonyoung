import { ReactNode } from "react";
import { serverAuthTool } from "../../../lib/auth-server-tool";

export default async function AdminAuthGuardLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  await serverAuthTool.requireAdminPageAccess();

  return children;
}
