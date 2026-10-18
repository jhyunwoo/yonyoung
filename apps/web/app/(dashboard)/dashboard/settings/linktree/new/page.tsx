import { redirect } from "next/navigation";
import LinktreeCreateForm from "@/app/(dashboard)/_components/linktree-create-form";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { isAdminRole } from "@/features/auth/model/auth-shared";

const LIST_PATH = "/dashboard/settings/linktree";

export default async function SettingsLinktreeCreatePage() {
  const session = await serverAuthGuard.requireSession();

  // 쓰기 권한이 없으면 생성 화면을 보여 줄 이유가 없다. 목록으로 되돌린다.
  if (!isAdminRole(session.user.role)) {
    redirect(LIST_PATH);
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <LinktreeCreateForm listPath={LIST_PATH} />
    </div>
  );
}
