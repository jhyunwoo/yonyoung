import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import McpConsentClient from "@/app/(dashboard)/auth/mcp-consent/consent-client";

export const metadata = {
  title: "AI 앱 연결 허용 | 연영회",
};

export default async function McpConsentPage() {
  // Better Auth는 로그인된 사용자만 이 화면으로 보낸다. 세션이 없으면 로그인부터 한다.
  await serverAuthGuard.requireSession();
  return <McpConsentClient />;
}
