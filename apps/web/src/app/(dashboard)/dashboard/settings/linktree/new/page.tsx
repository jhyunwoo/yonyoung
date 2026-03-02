import LinktreeCreateForm from "../../../../_components/linktree-create-form";
import { serverAuthTool } from "../../../../../../lib/auth-server-tool";
import { isAdminRole } from "../../../../../../lib/auth-shared";

export default async function SettingsLinktreeCreatePage() {
  const session = await serverAuthTool.requireSession();

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <LinktreeCreateForm
        canWrite={isAdminRole(session.user.role)}
        listPath="/dashboard/settings/linktree"
      />
    </main>
  );
}
