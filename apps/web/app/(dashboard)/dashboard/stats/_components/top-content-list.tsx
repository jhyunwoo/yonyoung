import Link from "next/link";

type TopContentListProps = {
  items: Array<{ resourceId: string; title: string; views: number }>;
  /** 공개 상세 페이지 경로 접두사. 조회수가 쌓이는 곳이 공개 페이지라 그쪽으로 연결한다. */
  hrefPrefix: "/archive/records" | "/archive/exhibitions";
  emptyMessage: string;
};

export default function TopContentList({
  items,
  hrefPrefix,
  emptyMessage,
}: TopContentListProps) {
  if (items.length === 0) {
    return <p className="text-caption text-ink-muted">{emptyMessage}</p>;
  }

  return (
    <ol className="flex flex-col divide-y divide-hairline">
      {items.map((item, index) => (
        <li
          key={item.resourceId}
          className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
        >
          <span className="w-5 shrink-0 text-right text-caption text-ink-muted tabular-nums">
            {index + 1}
          </span>
          <Link
            href={`${hrefPrefix}/${item.resourceId}`}
            className="min-h-11 min-w-0 flex-1 content-center truncate rounded-xs text-body-sm text-ink transition-colors duration-150 hover:text-primary-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) motion-reduce:transition-none"
          >
            {item.title}
          </Link>
          <span className="shrink-0 text-body-sm text-ink-secondary tabular-nums">
            {item.views.toLocaleString("ko-KR")}회
          </span>
        </li>
      ))}
    </ol>
  );
}
