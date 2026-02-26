import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cacheLife } from "next/cache";
import { serverAuthTool } from "../../../../lib/auth-server-tool";
import SignInPageClient from "./sign-in-page-client";

const readSignInSession = async () => {
  "use cache: private";
  cacheLife("seconds");
  return serverAuthTool.getSession();
};

const SignInGate = async () => {
  const session = await readSignInSession();

  if (session) {
    const redirectPath = await serverAuthTool.resolveAdminLandingPath(session);
    redirect(redirectPath);
  }

  return <SignInPageClient />;
};

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInPageClient />}>
      <SignInGate />
    </Suspense>
  );
}
