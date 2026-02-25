const pulse = "animate-pulse rounded-lg bg-slate-200";

export default function DashboardLoading() {
  return (
    <main className="px-4 py-6 md:px-8 md:py-8" data-testid="dashboard-loading">
      <p className="sr-only" role="status" aria-live="polite">
        대시보드를 불러오는 중입니다.
      </p>

      <div className="mx-auto grid w-full max-w-6xl gap-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className={`h-3 w-32 ${pulse}`} />
          <div className={`mt-3 h-8 w-80 max-w-full ${pulse}`} />
          <div className={`mt-3 h-4 w-full max-w-2xl ${pulse}`} />
          <div className={`mt-2 h-4 w-full max-w-xl ${pulse}`} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-center justify-between gap-3">
            <div className={`h-6 w-24 ${pulse}`} />
            <div className={`h-8 w-24 ${pulse}`} />
          </div>
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`dashboard-loading-notice-${index}`}
                className="rounded-lg border border-slate-200 px-4 py-3"
              >
                <div className={`h-4 w-3/4 ${pulse}`} />
                <div className={`mt-2 h-3 w-32 ${pulse}`} />
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className={`h-6 w-32 ${pulse}`} />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`dashboard-loading-left-${index}`}
                  className="rounded-lg border border-slate-200 px-4 py-3"
                >
                  <div className={`h-4 w-5/6 ${pulse}`} />
                  <div className={`mt-2 h-3 w-28 ${pulse}`} />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className={`h-6 w-28 ${pulse}`} />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={`dashboard-loading-right-${index}`}
                  className="rounded-lg border border-slate-200 px-4 py-3"
                >
                  <div className={`h-4 w-11/12 ${pulse}`} />
                  <div className={`mt-2 h-3 w-32 ${pulse}`} />
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-center justify-between gap-3">
            <div className={`h-6 w-20 ${pulse}`} />
            <div className={`h-3 w-20 ${pulse}`} />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`dashboard-loading-shortcut-${index}`}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className={`h-4 w-2/3 ${pulse}`} />
                <div className={`mt-2 h-3 w-full ${pulse}`} />
                <div className={`mt-1 h-3 w-4/5 ${pulse}`} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
