import { AdminLinkButton } from "../components/admin-form-controls";

/**
 * AdminUnassignedPage 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default function AdminUnassignedPage() {
  return (
    <main
      className="mx-auto max-w-3xl space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-6"
      data-testid="admin-unassigned-page"
    >
      <h1 className="text-xl font-semibold text-gray-900">
        소속 기수가 없어 관리자 화면에 접근할 수 없습니다.
      </h1>
      <p className="text-sm text-gray-700">
        회장에게 기수 배정을 요청해 주세요. 배정 후 다시 접속하면 정상적으로 접근할 수 있습니다.
      </p>
      <AdminLinkButton
        href="/auth/sign-in"
        variant="secondary"
        size="md"
      >
        로그인 페이지로 이동
      </AdminLinkButton>
    </main>
  );
}
