import { serverAuthTool } from "@/features/auth/server/auth-guard";
import { buildDashboardViewerProfile } from "@/features/dashboard/members/user-profile";
import MarketCreatePageClient from "@/app/(dashboard)/dashboard/market/new/market-create-page-client";

export default async function DashboardMarketCreatePage() {
  const session = await serverAuthTool.requireSession();
  const profile = await serverAuthTool.getCurrentUserProfile(session);
  const viewer = buildDashboardViewerProfile(session.user, profile);

  return (
    <MarketCreatePageClient
      viewer={{
        id: viewer.id,
        displayName: viewer.displayName,
        role: viewer.role,
      }}
    />
  );
}
