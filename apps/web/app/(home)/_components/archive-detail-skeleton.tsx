type ArchiveDetailSkeletonProps = {
  /** 제목 아래 메타 줄 수 — 활동은 기간 1줄, 전시는 기간·장소 2줄 */
  metaLines?: number;
  /** 갤러리 자리표시자 타일의 가로세로 비율 (활동 4/3, 전시 2/3) */
  tileAspect: string;
  "data-testid"?: string;
};

const PULSE = "animate-pulse bg-(--surface-muted)";

/**
 * 활동·전시 상세의 App Shell에 들어가는 스켈레톤.
 *
 * `generateStaticParams`에 없는 id로 처음 들어온 방문자는 이 셸을 즉시 받고 본문이
 * 스트리밍된다. 그래서 실제 상세 레이아웃과 높이·간격이 비슷해야 콘텐츠가 도착할 때
 * 레이아웃이 크게 튀지 않는다.
 */
export default function ArchiveDetailSkeleton({
  metaLines = 1,
  tileAspect,
  "data-testid": dataTestId,
}: ArchiveDetailSkeletonProps) {
  return (
    <div data-testid={dataTestId}>
      <p className="sr-only" role="status" aria-live="polite">
        페이지를 불러오는 중입니다.
      </p>

      <header className="mb-8">
        <div className={`h-9 w-3/4 max-w-lg md:h-11 ${PULSE}`} />
        {Array.from({ length: metaLines }).map((_, index) => (
          <div
            key={`archive-detail-skeleton-meta-${index}`}
            className={`mt-3 h-4 w-48 ${PULSE}`}
          />
        ))}
        <div className={`mt-4 h-4 w-full max-w-2xl ${PULSE}`} />
        <div className={`mt-2 h-4 w-full max-w-xl ${PULSE}`} />
      </header>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`archive-detail-skeleton-tile-${index}`}
            className={`${tileAspect} ${PULSE}`}
          />
        ))}
      </div>
    </div>
  );
}
