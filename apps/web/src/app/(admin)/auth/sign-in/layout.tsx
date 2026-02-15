import { ReactNode } from "react";
import { serverAuthTool } from "../../../../lib/auth-server-tool";

export default async function SignInRedirectLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  await serverAuthTool.redirectIfCanAccessAdmin();

  return children;
}
