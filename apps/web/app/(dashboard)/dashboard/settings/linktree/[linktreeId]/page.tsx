import { notFound } from "next/navigation";
import LinktreeGroupDetail from "@/app/(dashboard)/_components/linktree-group-detail";
import AdminReadErrorNotice from "@/app/(dashboard)/_components/admin-read-error";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { isAdminRole } from "@/features/auth/model/auth-shared";
import { readCookieHeader } from "@/shared/http/http";
import { getAdminLinktreeById } from "@/features/dashboard/services/admin-read-service";

export default async function SettingsLinktreeDetailPage({
  params,
}: Readonly<{
  params: Promise<{ linktreeId: string }>;
}>) {
  const [{ linktreeId }, session] = await Promise.all([
    params,
    serverAuthGuard.requireSession(),
  ]);

  const linktreeResult = await getAdminLinktreeById(linktreeId, await readCookieHeader());

  if (!linktreeResult.ok && linktreeResult.error.reason === "not_found") {
    notFound();
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      {linktreeResult.ok ? (
        <LinktreeGroupDetail
          initialLinktree={linktreeResult.data}
          canWrite={isAdminRole(session.user.role)}
          listPath="/dashboard/settings/linktree"
        />
      ) : (
        <AdminReadErrorNotice error={linktreeResult.error} />
      )}
    </div>
  );
}
