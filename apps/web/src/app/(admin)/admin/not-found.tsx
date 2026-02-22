import { AdminLinkButton } from "./components/admin-form-controls";

export default function AdminNotFoundPage() {
  return (
    <main className="mx-auto flex min-h-[72vh] w-full max-w-4xl items-center px-4 py-12">
      <section className="w-full rounded-3xl border border-gray-200 bg-white p-7 shadow-[0_16px_34px_-24px_rgba(0,0,0,0.58)] md:p-10">
        <p className="text-xs uppercase tracking-[0.16em] text-gray-500">404 Not Found</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight text-gray-900 md:text-4xl">
          요청한 관리자 페이지를 찾을 수 없습니다.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-gray-600 md:text-base">
          존재하지 않는 기수이거나 더 이상 접근할 수 없는 경로입니다.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <AdminLinkButton
            href="/admin"
            variant="primary"
          >
            관리자 홈으로 이동
          </AdminLinkButton>
          <AdminLinkButton
            href="/"
            variant="secondary"
          >
            홈페이지로 이동
          </AdminLinkButton>
        </div>
      </section>
    </main>
  );
}
