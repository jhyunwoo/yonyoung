import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  PageContainer,
  PageHeader,
} from "@/app/(dashboard)/_components/ui";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import {
  getMcpConnections,
  getMcpOverview,
} from "@/features/dashboard/services/admin-read-service";
import { readCookieHeader } from "@/shared/http/http";
import McpConnectionsClient from "@/app/(dashboard)/dashboard/mcp/connections-client";
import {
  ChatGptSection,
  ClaudeSection,
  ConnectorUrlSection,
  GUIDE_VERIFIED_ON,
  ToolListSection,
  TroubleshootingSection,
  UploadSection,
} from "@/app/(dashboard)/dashboard/mcp/mcp-guide-sections";

export const metadata = {
  title: "AI 연결 | 연영회 관리자",
};

export default async function McpGuidePage() {
  await serverAuthGuard.requireSession();
  const cookieHeader = await readCookieHeader();
  const [overview, connections] = await Promise.all([
    getMcpOverview(cookieHeader),
    getMcpConnections(cookieHeader),
  ]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="AI 연결"
        title="Claude·ChatGPT에서 대시보드 쓰기"
        description="연영 MCP를 연결하면 대화로 활동을 만들고 멤버를 관리할 수 있습니다. 할 수 있는 일은 내 역할을 따릅니다."
      />

      {overview.ok ? (
        <>
          <ConnectorUrlSection serverUrl={overview.data.serverUrl} />
          <ClaudeSection serverUrl={overview.data.serverUrl} />
          <ChatGptSection />
          <UploadSection />
          <ToolListSection overview={overview.data} />
        </>
      ) : (
        <Alert tone="danger" title="연결 정보를 불러오지 못했습니다">
          {overview.error.message}
        </Alert>
      )}

      <Card>
        <CardHeader
          title="연결된 앱"
          description="휴대폰을 잃어버렸거나 더 쓰지 않는 연결은 여기서 바로 끊을 수 있습니다."
        />
        <CardBody>
          {connections.ok ? (
            <McpConnectionsClient initialConnections={connections.data} />
          ) : (
            <Alert tone="danger">{connections.error.message}</Alert>
          )}
        </CardBody>
      </Card>

      <TroubleshootingSection />
      <p className="text-caption text-ink-muted">안내 내용 확인일: {GUIDE_VERIFIED_ON}</p>
    </PageContainer>
  );
}
