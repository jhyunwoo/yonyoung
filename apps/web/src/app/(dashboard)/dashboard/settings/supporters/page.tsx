import SupporterManager from "../../../_components/supporter-manager";
import { serverAuthTool } from "../../../../../lib/auth-server-tool";
import { isAdminRole } from "../../../../../lib/auth-shared";

export default async function SettingsSupportersPage() {
  const session = await serverAuthTool.requireSession();
  const supportersBasePath = "/dashboard/settings/supporters";

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <SupporterManager
        canWrite={isAdminRole(session.user.role)}
        basePath={supportersBasePath}
      />
    </main>
  );
}
