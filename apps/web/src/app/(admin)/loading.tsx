export default function AdminLoading() {
  return (
    <div
      className="admin-root fixed inset-0 z-[70] flex min-h-screen items-center justify-center bg-slate-900/25 px-4 backdrop-blur-md"
      data-testid="admin-loading"
    >
      <p className="sr-only" role="status" aria-live="polite">
        관리자 페이지를 불러오는 중입니다.
      </p>
      <div className="w-full max-w-sm rounded-3xl border border-white/45 bg-white/75 p-6 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
            <span className="absolute inset-0 animate-spin rounded-2xl border-2 border-gray-300 border-t-gray-900" />
            <span className="h-2.5 w-2.5 rounded-full bg-gray-900" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              관리자 화면 로딩 중
            </p>
            <p className="mt-1 text-xs text-gray-600">
              기존 화면을 유지한 채 데이터를 불러오고 있습니다.
            </p>
          </div>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-gray-200/80">
          <span className="block h-full w-1/2 animate-[pulse_1.4s_ease-in-out_infinite] rounded-full bg-gray-900/80" />
        </div>
      </div>
    </div>
  );
}
