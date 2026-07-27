import { headers } from "next/headers";
import { ExternalLink } from "lucide-react";
import { Suspense } from "react";

import DashboardLinktreeOverview from "@/app/(dashboard)/_components/dashboard-linktree-overview";
import DashboardPageViews from "@/app/(dashboard)/_components/dashboard-page-views";
import DashboardR2StorageUsage from "@/app/(dashboard)/_components/dashboard-r2-storage-usage";
import DashboardRuntimeMeta from "@/app/(dashboard)/_components/dashboard-runtime-meta";
import { Card } from "@/app/(dashboard)/_components/ui/card";
import { PageContainer } from "@/app/(dashboard)/_components/ui/layout-parts";
import { PageHeader } from "@/app/(dashboard)/_components/ui/page-header";
import { CardSkeleton } from "@/app/(dashboard)/_components/ui/skeletons";
import { buildButtonClass } from "@/app/(dashboard)/_components/ui/button-styles";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { Skeleton } from "@/components/ui/skeleton";

const YEONYOUNG_NAS_URL = "https://165.132.176.27:8080";

export default async function DashboardPage() {
  await serverAuthGuard.requireSession();

  const reqHeaders = await headers();
  const clientIp =
    reqHeaders.get("cf-connecting-ip") ||
    reqHeaders.get("x-real-ip") ||
    reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "";

  const isInternalNetwork =
    process.env.NODE_ENV === "development" || clientIp.startsWith("165.132.");

  return (
    <PageContainer>
      <PageHeader
        title="연영회에 오신 것을 환영합니다."
        description="왼쪽 메뉴에서 관리할 기수를 선택하면 공지, 활동, 전시 관리를 바로 시작할 수 있습니다."
        actions={
          isInternalNetwork ? (
            <a
              href={YEONYOUNG_NAS_URL}
              target="_blank"
              rel="noreferrer noopener"
              className={buildButtonClass({ variant: "secondary" })}
            >
              연영나스 열기
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          ) : (
            <div className="flex flex-col items-start gap-1.5">
              <button
                type="button"
                disabled
                data-testid="dashboard-nas-internal-only-button"
                className={buildButtonClass({ variant: "secondary" })}
              >
                연영나스 열기
              </button>
              <span className="text-caption text-ink-muted">
                연세대학교 내부망(165.132.x.x)에서만 접속할 수 있습니다. VPN을 사용해
                주세요.
              </span>
            </div>
          )
        }
      />

      <Suspense
        fallback={
          <Card>
            <Skeleton className="h-4 w-24" />
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`dashboard-page-views-stat-skeleton-${index + 1}`}
                  className="rounded-lg border border-hairline p-4"
                >
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="mt-2 h-7 w-16" />
                </div>
              ))}
            </div>
          </Card>
        }
      >
        <DashboardPageViews />
      </Suspense>

      <div className="grid gap-4 lg:grid-cols-2">
        <Suspense fallback={<CardSkeleton />}>
          <DashboardR2StorageUsage />
        </Suspense>

        <Suspense
          fallback={
            <Card>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-3 h-3 w-full max-w-xs" />
              <div className="mt-4 grid gap-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </Card>
          }
        >
          <DashboardLinktreeOverview />
        </Suspense>
      </div>

      <DashboardRuntimeMeta />
    </PageContainer>
  );
}
