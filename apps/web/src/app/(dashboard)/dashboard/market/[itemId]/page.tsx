import { serverAuthTool } from "../../../../../lib/auth-server-tool";
import { buildDashboardViewerProfile } from "../../../../../lib/user-profile";
import MarketItemDetailPageClient from "./market-item-detail-page-client";

export default async function DashboardMarketItemDetailPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const session = await serverAuthTool.requireSession();
  const profile = await serverAuthTool.getCurrentUserProfile(session);
  const viewer = buildDashboardViewerProfile(session.user, profile);
  const { itemId } = await params;

  return (
    <MarketItemDetailPageClient
      itemId={itemId}
      viewer={{
        id: viewer.id,
        displayName: viewer.displayName,
        role: viewer.role,
      }}
    />
  );
}
