import { Alert, PageContainer, PageHeader } from "@/app/(dashboard)/_components/ui";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { getMcpUploadLookup } from "@/features/dashboard/services/admin-read-service";
import { readCookieHeader } from "@/shared/http/http";
import McpUploadClient from "@/app/(dashboard)/dashboard/mcp/upload/[token]/upload-client";

export const metadata = {
  title: "파일 올리기 | 연영회 관리자",
};

const STATUS_MESSAGE: Record<string, string> = {
  receiving: "이미 올리는 중입니다. 잠시 뒤 대화로 돌아가 확인해 주세요.",
  completed: "이미 올라간 파일입니다. 대화로 돌아가 '올렸어'라고 알려 주세요.",
  consumed: "이미 사용한 업로드입니다.",
  failed: "이 업로드는 실패했습니다. AI에게 다시 준비해 달라고 요청해 주세요.",
};

const isExpired = (expiresAt: string) => new Date(expiresAt).getTime() <= Date.now();

export default async function McpUploadPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await serverAuthGuard.requireSession();
  const { token } = await params;
  const lookup = await getMcpUploadLookup(await readCookieHeader(), token);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="AI 연결"
        title="파일 올리기"
        description="AI가 직접 올리지 못한 파일을 여기서 올립니다. 대화에 첨부한 것과 같은 파일을 골라 주세요."
      />
      {!lookup.ok ? (
        <Alert tone="danger" title="업로드 주소를 쓸 수 없습니다">
          주소가 잘못되었거나, 다른 계정이 만든 주소입니다. 이 주소를 만든 계정으로
          로그인했는지 확인해 주세요.
        </Alert>
      ) : lookup.data.status !== "pending" ? (
        <Alert tone="info">{STATUS_MESSAGE[lookup.data.status]}</Alert>
      ) : isExpired(lookup.data.expiresAt) ? (
        <Alert tone="warning" title="업로드 주소가 만료되었습니다">
          10분이 지났습니다. AI에게 업로드를 다시 준비해 달라고 요청해 주세요.
        </Alert>
      ) : (
        <McpUploadClient lookup={lookup.data} />
      )}
    </PageContainer>
  );
}
