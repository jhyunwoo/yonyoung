import { notFound } from "next/navigation";
import LinktreeItemDetail from "@/app/(dashboard)/_components/linktree-item-detail";
import AdminReadErrorNotice from "@/app/(dashboard)/_components/admin-read-error";
import { findLinktreeItemById } from "@/app/(dashboard)/_components/linktree-shared";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { isAdminRole } from "@/features/auth/model/auth-shared";
import { readCookieHeader } from "@/shared/http/http";
import { getAdminLinktreeById } from "@/features/dashboard/services/admin-read-service";

export default async function SettingsLinktreeItemDetailPage({
  params,
}: Readonly<{
  params: Promise<{ linktreeId: string; itemId: string }>;
}>) {
  const [{ linktreeId, itemId }, session] = await Promise.all([
    params,
    serverAuthGuard.requireSession(),
  ]);

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
      <LinktreeItemDetail
        linktree={linktreeResult.data}
        item={item}
        canWrite={isAdminRole(session.user.role)}
        listPath="/dashboard/settings/linktree"
      />
    </div>
  );
}
