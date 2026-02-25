import type { Metadata } from "next";
import "./globals.css";
import { ReactNode } from "react";

import { createPageMetadata } from "../../lib/seo";
import DashboardShell, {
  type DashboardViewer,
} from "./_components/dashboard-shell";
import { serverAuthTool } from "../../lib/auth-server-tool";
import { getAccessibleDashboardGenerationOptions } from "../../lib/dashboard-generation-server";
import { buildDashboardViewerProfile } from "../../lib/user-profile";

export const metadata: Metadata = createPageMetadata({
  title: "연영회 Dashboard",
  description: "연영회 내부 인원 전용 대시보드",
  path: "/dashboard",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const session = await serverAuthTool.getSession();

  let generationOptions: Awaited<
    ReturnType<typeof getAccessibleDashboardGenerationOptions>
  > = [];
  let viewer: DashboardViewer | null = null;

  if (session) {
    const profile = await serverAuthTool.getCurrentUserProfile(session);
    generationOptions = await getAccessibleDashboardGenerationOptions(session, {
      profile,
    });
    viewer = buildDashboardViewerProfile(session.user, profile);
  }

  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <DashboardShell generationOptions={generationOptions} viewer={viewer}>
          {children}
        </DashboardShell>
      </body>
    </html>
  );
}
