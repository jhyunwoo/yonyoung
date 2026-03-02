import LinktreeItemEditForm from "@/app/(dashboard)/_components/linktree-item-edit-form";
import { serverAuthTool } from "@/features/auth/server/auth-server-tool";
import { isAdminRole } from "@/features/auth/model/auth-shared";

export default async function SettingsLinktreeItemEditPage({
  params,
}: Readonly<{
  params: Promise<{ linktreeId: string; itemId: string }>;
}>) {
  const [{ linktreeId, itemId }, session] = await Promise.all([
    params,
    serverAuthTool.requireSession(),
  ]);

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <LinktreeItemEditForm
        linktreeId={linktreeId}
        itemId={itemId}
        canWrite={isAdminRole(session.user.role)}
        listPath="/dashboard/settings/linktree"
      />
    </main>
  );
}
