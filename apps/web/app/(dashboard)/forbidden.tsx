import { Alert } from "@/app/(dashboard)/_components/ui/alert";
import { ButtonLink } from "@/app/(dashboard)/_components/ui/button-link";
import { Card, CardHeader } from "@/app/(dashboard)/_components/ui/card";
import { PageContainer } from "@/app/(dashboard)/_components/ui/layout-parts";
import { PageHeader } from "@/app/(dashboard)/_components/ui/page-header";

export default function DashboardForbiddenPage() {
  return (
    <PageContainer data-testid="dashboard-forbidden-page">
      <PageHeader
        eyebrow="403 Forbidden"
        title="이 기능에 접근할 권한이 없습니다."
        description="현재 계정으로는 요청하신 대시보드 화면을 열 수 없습니다. 역할 권한을 다시 확인하거나 필요한 경우 운영진에게 접근 권한을 요청해 주세요."
        actions={
          <>
            <ButtonLink href="/dashboard" variant="primary">
              대시보드 홈으로 이동
            </ButtonLink>
            <ButtonLink href="/auth/profile" variant="secondary">
              내 계정 정보 확인
            </ButtonLink>
          </>
        }
      />

      <Alert tone="warning" title="권한이 필요한 화면입니다.">
        일부 설정과 관리 메뉴는 회장단 또는 사용자 관리 권한이 있는 계정만 사용할 수
        있습니다.
      </Alert>

      <Card>
        <CardHeader title="다음을 확인해 주세요" />
        <ul className="mt-4 list-disc space-y-2 pl-5 text-body-sm text-ink-muted">
          <li>왼쪽 메뉴에서 접근 가능한 다른 화면으로 이동해 주세요.</li>
          <li>현재 역할에 맞는 권한이 있는지 프로필과 계정을 확인해 주세요.</li>
          <li>권한이 필요하면 운영진에게 계정 역할을 문의해 주세요.</li>
        </ul>
      </Card>
    </PageContainer>
  );
}
