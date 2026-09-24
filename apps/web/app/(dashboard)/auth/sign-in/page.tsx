import { redirect } from "next/navigation";
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

export default async function SignInPage() {
  const session = await readSessionOrNull();
  if (session) {
    const redirectPath = await serverAuthGuard.resolveAdminLandingPath(session);
    redirect(redirectPath);
  }

  return <SignInPageClient />;
}
