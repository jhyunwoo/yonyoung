import LinktreeManager from "../../../_components/linktree-manager";
import { serverAuthTool } from "../../../../../lib/auth-server-tool";
import { isAdminRole } from "../../../../../lib/auth-shared";

export default async function SettingsLinktreePage() {
  const session = await serverAuthTool.requireSession();

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <LinktreeManager
        canWrite={isAdminRole(session.user.role)}
        basePath="/dashboard/settings/linktree"
      />
    </main>
  );
}
