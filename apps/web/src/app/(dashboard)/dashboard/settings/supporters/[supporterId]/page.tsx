import SupporterDetail from "../../../../_components/supporter-detail";
import { serverAuthTool } from "../../../../../../lib/auth-server-tool";
import { isAdminRole } from "../../../../../../lib/auth-shared";

export default async function SettingsSupporterDetailPage({
  params,
}: Readonly<{
  params: Promise<{ supporterId: string }>;
}>) {
  const [{ supporterId }, session] = await Promise.all([
    params,
    serverAuthTool.requireSession(),
  ]);

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <SupporterDetail
        supporterId={supporterId}
        canWrite={isAdminRole(session.user.role)}
        listPath="/dashboard/settings/supporters"
      />
    </main>
  );
}
