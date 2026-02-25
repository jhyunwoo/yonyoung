import LinktreeGroupDetail from "../../../../_components/linktree-group-detail";
import { serverAuthTool } from "../../../../../../lib/auth-server-tool";
import { isAdminRole } from "../../../../../../lib/auth-shared";

export default async function SettingsLinktreeDetailPage({
  params,
}: Readonly<{
  params: Promise<{ linktreeId: string }>;
}>) {
  const [{ linktreeId }, session] = await Promise.all([
    params,
    serverAuthTool.requireSession(),
  ]);

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <LinktreeGroupDetail
        linktreeId={linktreeId}
        canWrite={isAdminRole(session.user.role)}
        listPath="/dashboard/settings/linktree"
      />
    </main>
  );
}
