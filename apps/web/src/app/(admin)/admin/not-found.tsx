import Link from "next/link";

/**
 * AdminNotFoundPage 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default function AdminNotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-16">
      <section className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-8 text-slate-900">
        <p className="text-sm font-semibold tracking-wide text-slate-600">404 NOT FOUND</p>
        <h1 className="mt-3 text-2xl font-bold">요청한 관리자 페이지를 찾을 수 없습니다.</h1>
        <p className="mt-3 text-sm text-slate-700">
          존재하지 않는 기수이거나 더 이상 접근할 수 없는 경로입니다.
        </p>
        <div className="mt-6">
          <Link
            href="/admin"
            className="inline-flex rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900"
          >
            관리자 홈으로 이동
          </Link>
        </div>
      </section>
    </main>
  );
}
