import Link from "next/link";

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

