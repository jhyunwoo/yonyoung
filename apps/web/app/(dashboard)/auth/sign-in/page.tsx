import { redirect } from "next/navigation";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import SignInPageClient from "@/app/(dashboard)/auth/sign-in/sign-in-page-client";
import { getApiBaseUrl } from "@/server/env";

const resolveAuthCanonicalOrigin = (): string | null => {
  try {
    const apiBaseUrl = new URL(getApiBaseUrl());
    if (!apiBaseUrl.hostname.startsWith("api.")) {
      return null;
    }

    apiBaseUrl.hostname = apiBaseUrl.hostname.slice("api.".length);
    return apiBaseUrl.origin;
  } catch {
    return null;
  }
};

export default async function SignInPage() {
  const session = await serverAuthGuard.getSession();
  if (session) {
    const redirectPath = await serverAuthGuard.resolveAdminLandingPath(session);
    redirect(redirectPath);
  }

  return <SignInPageClient authCanonicalOrigin={resolveAuthCanonicalOrigin()} />;
}
