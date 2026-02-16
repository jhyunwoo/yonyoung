export default function AdminShellLoading() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50" data-testid="admin-shell-loading">
      <aside className="w-64 border-r border-gray-200 bg-white p-4">
        <div className="h-9 w-28 animate-pulse rounded-md bg-gray-200" />
        <div className="mt-6 space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`admin-nav-loading-${index}`}
              className="h-10 animate-pulse rounded-md bg-gray-100"
            />
          ))}
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto p-6">
        <p className="sr-only" role="status" aria-live="polite">
          관리자 콘텐츠를 불러오는 중입니다.
        </p>
        <div className="mx-auto w-full max-w-7xl space-y-4">
          <div className="h-8 w-1/3 animate-pulse rounded-md bg-gray-200" />
          <div className="h-32 animate-pulse rounded-xl border border-gray-200 bg-white" />
          <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-white" />
        </div>
      </main>
    </div>
  );
}
