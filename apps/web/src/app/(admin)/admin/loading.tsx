export default function AdminShellLoading() {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/10 px-4 backdrop-blur-[1px]"
      data-testid="admin-shell-loading"
    >
      <p className="sr-only" role="status" aria-live="polite">
        관리자 콘텐츠를 불러오는 중입니다.
      </p>
      <span
        className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/45 bg-white/55 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.85)]"
        aria-hidden="true"
      >
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
      </span>
    </div>
  );
}
