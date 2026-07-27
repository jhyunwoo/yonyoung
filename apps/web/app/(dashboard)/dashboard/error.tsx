"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";

import { Alert } from "@/app/(dashboard)/_components/ui/alert";
import { Button } from "@/app/(dashboard)/_components/ui/button";
import { PageContainer } from "@/app/(dashboard)/_components/ui/layout-parts";
import { PageHeader } from "@/app/(dashboard)/_components/ui/page-header";

type DashboardErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardErrorPage({ error, reset }: DashboardErrorPageProps) {
  useEffect(() => {
    navigator.sendBeacon(
      "/api/internal/client-error",
      new Blob(
        [
          JSON.stringify({
            event: "client.error",
            path: window.location.pathname,
            message: error.message,
            stack: error.stack,
            sampledAt: Date.now(),
          }),
        ],
        { type: "application/json; charset=UTF-8" },
      ),
    );
  }, [error]);

  return (
    <PageContainer data-testid="dashboard-error-page">
      <PageHeader
        eyebrow="Dashboard Error"
        title="대시보드 정보를 불러오지 못했습니다."
        description="일시적인 네트워크 문제일 수 있습니다. 잠시 후 다시 시도해 주세요. 계속 실패하면 운영진에게 알려 주세요."
        actions={
          <Button
            data-testid="dashboard-error-reset"
            variant="primary"
            onClick={reset}
            leadingIcon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
          >
            다시 시도
          </Button>
        }
      />

      {error.digest !== undefined && (
        <Alert tone="danger" title="오류 코드">
          <code className="font-mono text-caption">{error.digest}</code>
        </Alert>
      )}
    </PageContainer>
  );
}
