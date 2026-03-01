import { serverAuthTool } from "../../../../../../lib/auth-server-tool";
import { buildDashboardViewerProfile } from "../../../../../../lib/user-profile";
import MarketItemEditPageClient from "./market-item-edit-page-client";

export default async function DashboardMarketItemEditPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const session = await serverAuthTool.requireSession();
  const profile = await serverAuthTool.getCurrentUserProfile(session);
  const viewer = buildDashboardViewerProfile(session.user, profile);
  const { itemId } = await params;

  return (
    <MarketItemEditPageClient
      itemId={itemId}
      viewer={{
        id: viewer.id,
        displayName: viewer.displayName,
        role: viewer.role,
      }}
    />
  );
}
