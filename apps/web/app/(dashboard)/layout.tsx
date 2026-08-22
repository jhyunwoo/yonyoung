import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { type ReactNode, Suspense } from "react";

import { createPageMetadata } from "@/features/seo/metadata/seo";
import DashboardShell, {
  type DashboardViewer,
} from "@/app/(dashboard)/_components/dashboard-shell";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { getAccessibleDashboardGenerationOptions } from "@/features/dashboard/generation/generation-options";
import { buildDashboardViewerProfile } from "@/features/dashboard/members/user-profile";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CardSkeleton,
  PageHeaderSkeleton,
} from "@/app/(dashboard)/_components/ui/skeletons";

// 뷰포트: safe-area 인셋(env(safe-area-inset-*))을 쓰려면 viewport-fit=cover 가
// 필요하다. 확대는 절대 막지 않는다(접근성).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "연영회 Dashboard",
    description: "연영회 내부 인원 전용 대시보드",
    path: "/dashboard",
  }),
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

const readDashboardLayoutData = async (): Promise<{
  generationOptions: Awaited<ReturnType<typeof getAccessibleDashboardGenerationOptions>>;
  viewer: DashboardViewer | null;
}> => {
  const session = await serverAuthGuard.getSession();
  if (!session) {
    return {
      generationOptions: [],
      viewer: null,
    };
  }

  const profile = await serverAuthGuard.getCurrentUserProfile(session);

  const generationOptions = await getAccessibleDashboardGenerationOptions(session, {
    ...(profile !== null ? { profile } : {}),
  });

  const viewer = buildDashboardViewerProfile(session.user, profile);

  return {
    generationOptions,
    viewer,
  };
};

const DashboardShellWithData = async ({
  children,
}: Readonly<{
  children: ReactNode;
}>) => {
  const { generationOptions, viewer } = await readDashboardLayoutData();

  return (
    <DashboardShell generationOptions={generationOptions} viewer={viewer}>
      {children}
    </DashboardShell>
  );
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* 첫 페인트 전에 localStorage 의 테마를 <html> 에 적용해 플래시를 막는다.
            (home) 과 같은 스크립트를 공유하므로 두 그룹의 테마 설정이 이어진다.
            beforeInteractive 라 하이드레이션보다 먼저 실행된다. */}
        <Script src="/theme-init.js" strategy="beforeInteractive" />
      </head>
      <body className="min-h-dvh bg-canvas text-ink antialiased">
        <Suspense
          fallback={
            <main
              className="min-h-dvh bg-canvas px-4 py-6 md:px-8 md:py-8"
              data-testid="dashboard-shell-loading"
            >
              <p className="sr-only" role="status" aria-live="polite">
                대시보드 셸을 불러오는 중입니다.
              </p>
              <div className="mx-auto grid w-full max-w-6xl gap-4 md:grid-cols-[15rem_minmax(0,1fr)]">
                <section className="rounded-lg border border-hairline bg-surface p-4">
                  <Skeleton className="h-10 w-10 rounded-md" />
                  <Skeleton className="mt-4 h-5 w-36" />
                  <div className="mt-6 space-y-2">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Skeleton
                        key={`dashboard-shell-nav-${index + 1}`}
                        className="h-11 w-full"
                      />
                    ))}
                  </div>
                </section>
                <section className="rounded-lg border border-hairline bg-surface p-6 md:p-8">
                  <PageHeaderSkeleton />
                  <div className="mt-8 grid gap-4 md:grid-cols-2">
                    <CardSkeleton />
                    <CardSkeleton />
                  </div>
                </section>
              </div>
            </main>
          }
        >
          <DashboardShellWithData>{children}</DashboardShellWithData>
        </Suspense>
      </body>
    </html>
  );
}
