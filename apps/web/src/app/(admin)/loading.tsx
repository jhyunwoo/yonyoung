export default function AdminLoading() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gray-50"
      data-testid="admin-loading"
    >
      <p className="sr-only" role="status" aria-live="polite">
        관리자 페이지를 불러오는 중입니다.
      </p>
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-sm">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
        <span className="text-sm font-medium text-gray-700">Loading admin page</span>
      </div>
    </div>
  );
}
