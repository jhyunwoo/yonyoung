import { serverAuthTool } from "../../../../../lib/auth-server-tool";
import { buildDashboardViewerProfile } from "../../../../../lib/user-profile";
import MarketCreatePageClient from "./market-create-page-client";

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
