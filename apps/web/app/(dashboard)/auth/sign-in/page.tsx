import { redirect } from "next/navigation";
import { serverAuthTool } from "@/features/auth/server/auth-server-tool";
import SignInPageClient from "@/app/(dashboard)/auth/sign-in/sign-in-page-client";

export default async function SignInPage() {
  const session = await serverAuthTool.getSession();
  if (session) {
    const redirectPath = await serverAuthTool.resolveAdminLandingPath(session);
    redirect(redirectPath);
  }

  return <SignInPageClient />;
}
