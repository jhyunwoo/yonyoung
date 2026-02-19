import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { serverAuthTool } from "../../../../lib/auth-server-tool";
import { canAccessAdminPage } from "../../../../lib/auth-shared";

/**
 * SignInRedirectLayout 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @param {
  children,
} 함수 로직에서 사용하는 입력값입니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default async function SignInRedirectLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const session = await serverAuthTool.getSession();
  if (!session) {
    return children;
  }

  if (canAccessAdminPage(session)) {
    const landingPath = await serverAuthTool.resolveAdminLandingPath(session);
    redirect(landingPath);
  }

  redirect("/auth/profile");

  return null;
}
