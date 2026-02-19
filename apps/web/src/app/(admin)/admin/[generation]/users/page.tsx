import UsersAdminPageClient from "../../users/users-admin-page-client";

type GenerationUsersPageProps = {
  params: Promise<{ generation: string }>;
};

/**
 * GenerationUsersPage 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @param {
  params,
} 동작 분기를 제어하는 파라미터입니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default async function GenerationUsersPage({
  params,
}: GenerationUsersPageProps) {
  const { generation } = await params;
  const generationSortOrder = Number.parseInt(generation, 10);

  return (
    <UsersAdminPageClient
      generationSortOrder={Number.isFinite(generationSortOrder) ? generationSortOrder : null}
      generationScoped
    />
  );
}
