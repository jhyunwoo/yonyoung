export default function AdminLoading() {
  return (
    <div
      className="admin-root flex min-h-screen items-center justify-center bg-[var(--admin-bg-primary)]"
      data-testid="admin-loading"
    >
      <p className="sr-only" role="status" aria-live="polite">
        관리자 페이지를 불러오는 중입니다.
      </p>
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-sm">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--admin-border-strong)] border-t-[var(--admin-text-primary)]" />
        <span className="text-sm font-medium text-gray-700">Loading admin page</span>
      </div>
    </div>
  );
}
