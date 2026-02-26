import { redirect } from "next/navigation";
import { serverAuthTool } from "../../../../lib/auth-server-tool";
import SignInPageClient from "./sign-in-page-client";

export default async function SignInPage() {
  const session = await serverAuthTool.getSession();
  if (session) {
    const redirectPath = await serverAuthTool.resolveAdminLandingPath(session);
    redirect(redirectPath);
  }

  return <SignInPageClient />;
}
