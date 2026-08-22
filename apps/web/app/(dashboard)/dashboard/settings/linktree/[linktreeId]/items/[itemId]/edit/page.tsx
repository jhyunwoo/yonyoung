import { notFound, redirect } from "next/navigation";
import LinktreeItemEditForm from "@/app/(dashboard)/_components/linktree-item-edit-form";
import AdminReadErrorNotice from "@/app/(dashboard)/_components/admin-read-error";
import { findLinktreeItemById } from "@/app/(dashboard)/_components/linktree-shared";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { isAdminRole } from "@/features/auth/model/auth-shared";
import { readCookieHeader } from "@/shared/http/http";
import { getAdminLinktreeById } from "@/features/dashboard/services/admin-read-service";

const LIST_PATH = "/dashboard/settings/linktree";

export default async function SettingsLinktreeItemEditPage({
  params,
}: Readonly<{
  params: Promise<{ linktreeId: string; itemId: string }>;
}>) {
  const [{ linktreeId, itemId }, session] = await Promise.all([
    params,
    serverAuthGuard.requireSession(),
  ]);

  // 쓰기 권한이 없으면 편집 화면을 보여 줄 이유가 없다. 상세로 되돌린다.
  if (!isAdminRole(session.user.role)) {
    redirect(`${LIST_PATH}/${linktreeId}/items/${itemId}`);
  }

  const linktreeResult = await getAdminLinktreeById(linktreeId, await readCookieHeader());

  if (!linktreeResult.ok) {
    if (linktreeResult.error.reason === "not_found") {
      notFound();
    }

    return (
      <div className="px-4 py-6 md:px-8 md:py-8">
        <AdminReadErrorNotice error={linktreeResult.error} />
      </div>
    );
  }

  // 링크 아이템은 분류 응답 안에 함께 실려 오므로 여기서 골라낸다.
  const item = findLinktreeItemById(linktreeResult.data, itemId);
  if (!item) {
    notFound();
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <LinktreeItemEditForm
        linktree={linktreeResult.data}
        item={item}
        listPath={LIST_PATH}
      />
    </div>
  );
}
