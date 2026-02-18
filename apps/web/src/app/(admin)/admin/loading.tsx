export default function AdminShellLoading() {
  return (
    <div className="space-y-4" data-testid="admin-shell-loading">
      <p className="sr-only" role="status" aria-live="polite">
        관리자 콘텐츠를 불러오는 중입니다.
      </p>
      <div className="h-8 w-1/3 animate-pulse rounded-md bg-gray-200" />
      <div className="h-32 animate-pulse rounded-xl border border-gray-200 bg-white" />
      <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-white" />
    </div>
  );
}
