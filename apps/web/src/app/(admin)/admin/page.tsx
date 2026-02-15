import { forbidden, redirect } from "next/navigation";
import { getAccessibleGenerations, buildGenerationPath } from "../../../lib/admin-generation";
import {
  fetchGenerationsFromServer,
  readServerCookieHeader,
} from "../../../lib/admin-generation-server";
import { serverAuthTool } from "../../../lib/auth-server-tool";

/**
 * AdminPage 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default async function AdminPage() {
  const session = await serverAuthTool.requireAdminPageAccess();
  const cookieHeader = await readServerCookieHeader();
  const generations = await fetchGenerationsFromServer(cookieHeader);
  const accessible = getAccessibleGenerations(session, generations);

  if (accessible.length === 0) {
    forbidden();
  }

  const defaultGeneration = accessible[0];
  if (!defaultGeneration) {
    forbidden();
  }

  redirect(buildGenerationPath(defaultGeneration.sortOrder));
}
