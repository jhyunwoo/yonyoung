export default function AdminShellLoading() {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/20 px-4 backdrop-blur-sm"
      data-testid="admin-shell-loading"
    >
      <p className="sr-only" role="status" aria-live="polite">
        관리자 콘텐츠를 불러오는 중입니다.
      </p>
      <div className="w-full max-w-md rounded-3xl border border-white/45 bg-white/75 p-6 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 animate-[bounce_0.9s_ease-in-out_infinite] rounded-full bg-gray-900 [animation-delay:-0.2s]" />
          <span className="h-2.5 w-2.5 animate-[bounce_0.9s_ease-in-out_infinite] rounded-full bg-gray-700 [animation-delay:-0.1s]" />
          <span className="h-2.5 w-2.5 animate-[bounce_0.9s_ease-in-out_infinite] rounded-full bg-gray-500" />
          <span className="ml-1 text-sm font-medium text-gray-800">
            로딩 중...
          </span>
        </div>
        <div className="mt-5 space-y-3">
          <div className="h-3 w-1/2 animate-pulse rounded-full bg-gray-300/70" />
          <div className="h-12 animate-pulse rounded-2xl border border-gray-200/80 bg-white/85" />
          <div className="h-20 animate-pulse rounded-2xl border border-gray-200/80 bg-white/85" />
        </div>
      </div>
    </div>
  );
}
