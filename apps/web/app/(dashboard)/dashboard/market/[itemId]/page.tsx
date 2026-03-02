import { serverAuthTool } from "@/features/auth/server/auth-server-tool";
import { buildDashboardViewerProfile } from "@/features/dashboard/members/user-profile";
import MarketItemDetailPageClient from "@/app/(dashboard)/dashboard/market/[itemId]/market-item-detail-page-client";

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
