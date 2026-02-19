import Link from "next/link";

export default function AdminNotFoundPage() {
  return (
    <main className="mx-auto flex min-h-[72vh] w-full max-w-4xl items-center px-4 py-12">
      <section className="w-full rounded-3xl border border-gray-200 bg-white p-7 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.42)] md:p-10">
        <p className="text-xs uppercase tracking-[0.16em] text-gray-500">404 Not Found</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight text-gray-900 md:text-4xl">
          요청한 관리자 페이지를 찾을 수 없습니다.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-gray-600 md:text-base">
          존재하지 않는 기수이거나 더 이상 접근할 수 없는 경로입니다.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="inline-flex rounded-full bg-[var(--admin-accent)] px-4 py-2 text-sm font-medium text-[var(--admin-bg-primary)] transition hover:brightness-110"
          >
            관리자 홈으로 이동
          </Link>
          <Link
            href="/"
            className="inline-flex rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            홈페이지로 이동
          </Link>
        </div>
      </section>
    </main>
  );
}
