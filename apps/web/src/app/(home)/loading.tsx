export default function HomeLoading() {
  return (
    <div className="px-4 pb-16 pt-14 md:px-6 md:pb-20 md:pt-18" data-testid="home-loading">
      <p className="sr-only" role="status" aria-live="polite">
        페이지를 불러오는 중입니다.
      </p>

      <div className="mx-auto w-full max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-3xl border border-(--surface-border) bg-(--surface-elevated) p-6 md:p-10">
          <div className="h-3 w-40 animate-pulse rounded-full bg-(--surface-muted)" />
          <div className="mt-4 h-12 w-3/5 animate-pulse rounded-xl bg-(--surface-muted)" />
          <div className="mt-3 h-4 w-4/5 animate-pulse rounded-full bg-(--surface-muted)" />
          <div className="mt-2 h-4 w-2/3 animate-pulse rounded-full bg-(--surface-muted)" />

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                // skeleton placeholder
                key={`home-loading-card-${index}`}
                className="rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-4"
              >
                <div className="aspect-[5/4] animate-pulse rounded-xl bg-(--surface-muted)" />
                <div className="mt-4 h-3 w-1/3 animate-pulse rounded-full bg-(--surface-muted)" />
                <div className="mt-2 h-6 w-2/3 animate-pulse rounded-lg bg-(--surface-muted)" />
                <div className="mt-2 h-4 w-full animate-pulse rounded-full bg-(--surface-muted)" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
