import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { DASHBOARD_PATH } from "@/features/auth/model/auth-shared";

export default async function DashboardRouteLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  // 프로필 조회는 세션을 기다릴 필요가 없다(쿠키만 필요). 먼저 띄워 두면 세션
  // 왕복과 겹쳐서 대시보드 진입의 직렬 왕복이 하나 줄어든다.
  const currentUserRequest = serverAuthGuard.getCurrentUserMe();
  const session = await serverAuthGuard.requireSession();
  await currentUserRequest;
  const redirectPath = await serverAuthGuard.resolveAdminLandingPath(session);

  if (redirectPath !== DASHBOARD_PATH) {
    redirect(redirectPath);
  }

  return <>{children}</>;
}
