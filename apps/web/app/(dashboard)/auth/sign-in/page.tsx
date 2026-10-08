import { redirect } from "next/navigation";
import { isOAuthAuthorizationRequest } from "@/features/auth/model/oauth-flow";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { isSessionUnavailableError } from "@/features/auth/server/auth-server";
import SignInPageClient from "@/app/(dashboard)/auth/sign-in/sign-in-page-client";

const readSessionOrNull = async () => {
  try {
    return await serverAuthGuard.getSession();
  } catch (error) {
    // 세션 API가 잠시 응답하지 않아도 로그인 화면 자체는 보여 준다.
    if (isSessionUnavailableError(error)) {
      return null;
    }
    throw error;
  }
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const session = await readSessionOrNull();
  // AI 앱 연결 중이면 대시보드로 보내지 않는다. 다시 로그인하면 Better Auth가 인가를 이어간다.
  if (session && !isOAuthAuthorizationRequest(query)) {
    const redirectPath = await serverAuthGuard.resolveAdminLandingPath(session);
    redirect(redirectPath);
  }

  return <SignInPageClient />;
}
