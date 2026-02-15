import Link from "next/link";

/**
 * AdminUnassignedPage 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default function AdminUnassignedPage() {
  return (
    <main
      className="mx-auto max-w-3xl space-y-4 rounded-xl border border-amber-300 bg-amber-50 p-6"
      data-testid="admin-unassigned-page"
    >
      <h1 className="text-xl font-semibold text-amber-900">
        소속 기수가 없어 관리자 화면에 접근할 수 없습니다.
      </h1>
      <p className="text-sm text-amber-800">
        회장에게 기수 배정을 요청해 주세요. 배정 후 다시 접속하면 정상적으로 접근할 수 있습니다.
      </p>
      <Link
        href="/auth/sign-in"
        className="inline-flex rounded-md border border-amber-500 bg-white px-3 py-2 text-sm font-medium text-amber-900"
      >
        로그인 페이지로 이동
      </Link>
    </main>
  );
}

