import { ReactNode } from "react";
import { serverAuthTool } from "../../../../lib/auth-server-tool";

type GenerationsLayoutProps = {
  children: ReactNode;
};

export default async function GenerationsLayout({
  children,
}: GenerationsLayoutProps) {
  await serverAuthTool.requirePresidentAccess("/admin");
  return children;
}

