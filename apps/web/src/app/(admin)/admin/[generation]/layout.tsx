import { ReactNode } from "react";
import { forbidden, notFound } from "next/navigation";
import { getAccessibleGenerations, resolveGenerationBySortOrder } from "../../../../lib/admin-generation";
import {
  fetchGenerationsFromServer,
  readServerCookieHeader,
} from "../../../../lib/admin-generation-server";
import { serverAuthTool } from "../../../../lib/auth-server-tool";

type GenerationLayoutProps = {
  children: ReactNode;
  params: Promise<{ generation: string }>;
};

/**
 * GenerationScopedLayout 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @param {
  children,
  params,
} 동작 분기를 제어하는 파라미터입니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default async function GenerationScopedLayout({
  children,
  params,
}: GenerationLayoutProps) {
  const { generation } = await params;
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

  const selected = resolveGenerationBySortOrder(generations, generation);
  if (!selected) {
    notFound();
  }

  const isAllowed = accessible.some(
        /**
     * accessible.some 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
     * @param candidate 대상을 식별하기 위한 ID 값입니다.
     * @returns 함수 실행 결과를 반환합니다.
     * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
     */
    (candidate) => candidate.id === selected.id,
  );
  if (!isAllowed) {
    forbidden();
  }

  return children;
}
