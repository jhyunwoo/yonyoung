import Link from "next/link";

export default function HomeNotFoundPage() {
  return (
    <section className="px-4 pb-18 pt-14 md:px-6 md:pt-20" data-testid="home-not-found-page">
      <div className="mx-auto w-full max-w-3xl rounded-3xl border border-(--surface-border) bg-(--surface-elevated) p-7 shadow-[0_24px_60px_-42px_var(--shadow-strong)] md:p-10">
        <p className="text-xs uppercase tracking-[0.16em] text-(--text-muted)">404 Not Found</p>
        <h1 className="mt-3 font-display text-4xl leading-tight text-(--text-primary) md:text-5xl">
          찾으시는 페이지가 없습니다.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-(--text-secondary) md:text-base">
          주소가 잘못 입력되었거나, 페이지가 이동 또는 삭제되었을 수 있습니다.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex rounded-full bg-(--accent) px-4 py-2 text-sm font-medium text-(--accent-foreground) transition hover:opacity-90"
          >
            홈으로 이동
          </Link>
          <Link
            href="/archive/records"
            className="inline-flex rounded-full border border-(--surface-border) bg-(--surface-elevated) px-4 py-2 text-sm font-medium text-(--text-primary) transition hover:border-(--accent)"
          >
            아카이브 보기
          </Link>
        </div>
      </div>
    </section>
  );
}
