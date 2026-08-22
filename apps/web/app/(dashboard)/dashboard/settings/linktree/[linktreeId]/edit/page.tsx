import { notFound, redirect } from "next/navigation";
import LinktreeGroupEditForm from "@/app/(dashboard)/_components/linktree-group-edit-form";
import AdminReadErrorNotice from "@/app/(dashboard)/_components/admin-read-error";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { isAdminRole } from "@/features/auth/model/auth-shared";
import { readCookieHeader } from "@/shared/http/http";
import { getAdminLinktreeById } from "@/features/dashboard/services/admin-read-service";

const LIST_PATH = "/dashboard/settings/linktree";

export default async function SettingsLinktreeEditPage({
  params,
}: Readonly<{
  params: Promise<{ linktreeId: string }>;
}>) {
  const [{ linktreeId }, session] = await Promise.all([
    params,
    serverAuthGuard.requireSession(),
  ]);

  // 쓰기 권한이 없으면 편집 화면을 보여 줄 이유가 없다. 상세로 되돌린다.
  if (!isAdminRole(session.user.role)) {
    redirect(`${LIST_PATH}/${linktreeId}`);
  }

  const linktreeResult = await getAdminLinktreeById(linktreeId, await readCookieHeader());

  if (!linktreeResult.ok && linktreeResult.error.reason === "not_found") {
    notFound();
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      {linktreeResult.ok ? (
        <LinktreeGroupEditForm linktree={linktreeResult.data} listPath={LIST_PATH} />
      ) : (
        <AdminReadErrorNotice error={linktreeResult.error} />
      )}
    </div>
  );
}
