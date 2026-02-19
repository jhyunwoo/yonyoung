import { redirect } from "next/navigation";
import { serverAuthTool } from "../../../../lib/auth-server-tool";
import {
  canAccessAdminPage,
  hasCompletedRequiredProfile,
  isUnverifiedRole,
} from "../../../../lib/auth-shared";
import ProfilePageClient from "../../admin/profile/profile-page-client";

/**
 * AuthProfilePage 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks 미인증 사용자도 기본 정보를 입력할 수 있도록 인증된 세션만 요구합니다.
 */
export default async function AuthProfilePage() {
  const session = await serverAuthTool.requireSession();
  const isProfileComplete = hasCompletedRequiredProfile(session.user);
  const canAccessAdmin = canAccessAdminPage(session);

  if (canAccessAdmin && isProfileComplete) {
    redirect("/admin");
  }

  if (isUnverifiedRole(session.user.role) && isProfileComplete) {
    redirect("/auth/pending-approval");
  }

  const successRedirectPath = isUnverifiedRole(session.user.role)
    ? "/auth/pending-approval"
    : "/";

  return (
    <ProfilePageClient
      userId={session.user.id}
      mode="auth"
      successRedirectPath={successRedirectPath}
    />
  );
}
