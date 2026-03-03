import type { Metadata } from "next";
import "./globals.css";
import { ReactNode, Suspense } from "react";
import { Noto_Sans_KR } from "next/font/google";

import { createPageMetadata } from "@/features/seo/metadata/seo";
import DashboardShell, {
  type DashboardViewer,
} from "@/app/(dashboard)/_components/dashboard-shell";
import { serverAuthTool } from "@/features/auth/server/auth-guard";
import { getAccessibleDashboardGenerationOptions } from "@/features/dashboard/generation/generation-options";
import { buildDashboardViewerProfile } from "@/features/dashboard/members/user-profile";
import { Skeleton } from "@/components/ui/skeleton";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = createPageMetadata({
  title: "연영회 Dashboard",
  description: "연영회 내부 인원 전용 대시보드",
  path: "/dashboard",
});

const readDashboardLayoutData = async (): Promise<{
  generationOptions: Awaited<ReturnType<typeof getAccessibleDashboardGenerationOptions>>;
  viewer: DashboardViewer | null;
}> => {
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
      <body className={notoSansKr.className}>
        <Suspense
          fallback={
            <main
              className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-8"
              data-testid="dashboard-shell-loading"
            >
              <p className="sr-only" role="status" aria-live="polite">
                대시보드 셸을 불러오는 중입니다.
              </p>
              <div className="mx-auto grid w-full max-w-6xl gap-4 md:grid-cols-[18rem_minmax(0,1fr)]">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <Skeleton className="h-11 w-11 rounded-full" />
                  <Skeleton className="mt-4 h-5 w-36" />
                  <Skeleton className="mt-2 h-3 w-24" />
                  <div className="mt-6 space-y-2">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Skeleton
                        key={`dashboard-shell-nav-${index + 1}`}
                        className="h-10 w-full"
                      />
                    ))}
                  </div>
                  <div className="mt-10">
                    <Skeleton className="h-12 w-full" />
                  </div>
                </section>
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="mt-3 h-4 w-full max-w-xl" />
                  <Skeleton className="mt-2 h-4 w-full max-w-lg" />
                  <div className="mt-8 grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
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
