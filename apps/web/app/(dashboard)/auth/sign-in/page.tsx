import { redirect } from "next/navigation";
import { DASHBOARD_PATH } from "@/features/auth/model/auth-shared";
import {
  isOAuthAuthorizationRequest,
  resolveSignInReturnPath,
} from "@/features/auth/model/oauth-flow";
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
  const returnPath = resolveSignInReturnPath(query.next);
  const session = await readSessionOrNull();
  // AI 앱 연결 중이면 대시보드로 보내지 않는다. 다시 로그인하면 Better Auth가 인가를 이어간다.
  if (session && !isOAuthAuthorizationRequest(query)) {
    const landingPath = await serverAuthGuard.resolveAdminLandingPath(session);
    // 프로필 작성·승인 대기가 먼저다. 대시보드에 들어갈 수 있을 때만 원래 주소로 돌려보낸다.
    redirect(landingPath === DASHBOARD_PATH && returnPath ? returnPath : landingPath);
  }

  return <SignInPageClient returnPath={returnPath} />;
}
