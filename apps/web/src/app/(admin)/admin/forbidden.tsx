import Link from "next/link";

export default function AdminForbiddenPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-16">
      <section className="w-full rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-950">
        <p className="text-sm font-semibold tracking-wide text-rose-700">403 FORBIDDEN</p>
        <h1 className="mt-3 text-2xl font-bold">관리자 페이지 접근 권한이 없습니다.</h1>
        <p className="mt-3 text-sm text-rose-800">
          현재 계정은 요청한 관리자 화면에 접근할 수 없습니다. 권한이 필요한 경우 회장에게 문의해 주세요.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="inline-flex rounded-md border border-rose-400 bg-white px-3 py-2 text-sm font-medium text-rose-900"
          >
            관리자 홈으로 이동
          </Link>
          <Link
            href="/auth/sign-in"
            className="inline-flex rounded-md border border-rose-400 bg-rose-600 px-3 py-2 text-sm font-medium text-white"
          >
            다른 계정으로 로그인
          </Link>
        </div>
      </section>
    </main>
  );
}
