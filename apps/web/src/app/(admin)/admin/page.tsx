import { forbidden, redirect } from "next/navigation";
import { getAccessibleGenerations, buildGenerationPath } from "../../../lib/admin-generation";
import {
  fetchGenerationsFromServer,
} from "../../../lib/admin-generation-server";
import { canManageGenerations } from "../../../lib/auth-shared";
import { serverAuthTool } from "../../../lib/auth-server-tool";

/**
 * AdminPage 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default async function AdminPage() {
  const session = await serverAuthTool.requireAdminPageAccess();
  await serverAuthTool.redirectIfProfileIncomplete(session);

  const latestSortOrderInSession =
    typeof session.user.latestGenerationSortOrder === "number" &&
    Number.isFinite(session.user.latestGenerationSortOrder)
      ? session.user.latestGenerationSortOrder
      : null;

  if (canManageGenerations(session) && latestSortOrderInSession !== null) {
    redirect(buildGenerationPath(latestSortOrderInSession));
  }

  const generations = await fetchGenerationsFromServer(null);
  const accessible = getAccessibleGenerations(session, generations);

  if (accessible.length === 0) {
    forbidden();
  }

  const latestGeneration = accessible.reduce((latest, current) =>
    current.sortOrder > latest.sortOrder ? current : latest,
  );
  redirect(buildGenerationPath(latestGeneration.sortOrder));
}
