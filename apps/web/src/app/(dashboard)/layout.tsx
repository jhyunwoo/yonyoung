import type { Metadata } from "next";
import "./globals.css";
import { ReactNode, Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";

import { createPageMetadata } from "../../lib/seo";
import DashboardShell, {
  type DashboardViewer,
} from "./_components/dashboard-shell";
import { serverAuthTool } from "../../lib/auth-server-tool";
import { getAccessibleDashboardGenerationOptions } from "../../lib/dashboard-generation-server";
import { buildDashboardViewerProfile } from "../../lib/user-profile";
import { ADMIN_CACHE_TAGS } from "../../lib/admin-cache";

export const metadata: Metadata = createPageMetadata({
  title: "연영회 Dashboard",
  description: "연영회 내부 인원 전용 대시보드",
  path: "/dashboard",
});

const readDashboardLayoutData = async (): Promise<{
  generationOptions: Awaited<
    ReturnType<typeof getAccessibleDashboardGenerationOptions>
  >;
  viewer: DashboardViewer | null;
}> => {
  "use cache: private";
  cacheLife("minutes");
  cacheTag(ADMIN_CACHE_TAGS.generations);
  cacheTag(ADMIN_CACHE_TAGS.users);

  const session = await serverAuthTool.getSession();
  if (!session) {
    return {
      generationOptions: [],
      viewer: null,
    };
  }

  const profile = await serverAuthTool.getCurrentUserProfile(session);
  const generationOptions = await getAccessibleDashboardGenerationOptions(session, {
    profile,
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
      <body>
        <Suspense
          fallback={
            <main
              className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-8"
              data-testid="dashboard-shell-loading"
            >
              <p className="sr-only" role="status" aria-live="polite">
                대시보드 셸을 불러오는 중입니다.
              </p>
              <div className="mx-auto h-64 w-full max-w-6xl animate-pulse rounded-2xl border border-slate-200 bg-white" />
            </main>
          }
        >
          <DashboardShellWithData>{children}</DashboardShellWithData>
        </Suspense>
      </body>
    </html>
  );
}
