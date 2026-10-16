"use client";

import { useState } from "react";
import Link from "next/link";
import type { ApiVisitorInsights } from "@yonyoung/contracts";
import { Card, CardHeader } from "@/app/(dashboard)/_components/ui/card";
import {
  formatCount,
  formatDuration,
  formatPercent,
  PAGE_TYPE_LABEL,
} from "@/features/dashboard/stats/insights-format";

type Row = ApiVisitorInsights["content"][number];
type SortKey = "views" | "visitors" | "avgEngagedMs" | "entries" | "bounceRate";

const COLUMNS: ReadonlyArray<{ key: SortKey; label: string; testId: string }> = [
  { key: "views", label: "조회수", testId: "views" },
  { key: "visitors", label: "방문자", testId: "visitors" },
  { key: "avgEngagedMs", label: "평균 체류", testId: "duration" },
  { key: "entries", label: "진입", testId: "entries" },
  { key: "bounceRate", label: "이탈률", testId: "bounce" },
];

const HREF_PREFIX = {
  activity: "/archive/records",
  exhibition: "/archive/exhibitions",
} as const;

const titleOf = (row: Row) => row.title ?? PAGE_TYPE_LABEL[row.pageType];

export default function ContentTable({ insights }: { insights: ApiVisitorInsights }) {
  const [sortKey, setSortKey] = useState<SortKey>("views");
  // null(측정 안 됨)은 정렬 방향과 관계없이 맨 아래로 보낸다.
  const rows = [...insights.content].sort(
    (a, b) => (b[sortKey] ?? -1) - (a[sortKey] ?? -1),
  );

  return (
    <Card data-testid="stats-content">
      <CardHeader
        title="콘텐츠"
        description="조회수 상위 50개. 열 이름을 누르면 그 기준으로 정렬"
      />
      {rows.length === 0 ? (
        <p className="mt-4 text-caption text-ink-muted">
          이 기간·조건에 조회된 페이지가 없습니다.
        </p>
      ) : (
        <div className="mt-4 max-h-[32rem] overflow-auto rounded-md border border-hairline">
          <table className="w-full min-w-[40rem] text-left text-body-sm tabular-nums">
            <thead className="sticky top-0 bg-canvas-soft text-caption text-ink-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  페이지
                </th>
                {COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={sortKey === column.key ? "descending" : "none"}
                    className="px-1 py-1 text-right font-medium"
                  >
                    <button
                      type="button"
                      data-testid={`btn-stats-sort-${column.testId}`}
                      onClick={() => setSortKey(column.key)}
                      className="min-h-11 w-full rounded-xs px-2 text-right hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
                    >
                      {column.label}
                      {sortKey === column.key ? " ↓" : ""}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {rows.map((row) => (
                <tr key={`${row.pageType}:${row.resourceId}`}>
                  <td className="px-3 py-2 text-ink">
                    <span className="mr-2 text-caption text-ink-muted">
                      {PAGE_TYPE_LABEL[row.pageType]}
                    </span>
                    {row.pageType === "activity" || row.pageType === "exhibition" ? (
                      <Link
                        href={`${HREF_PREFIX[row.pageType]}/${row.resourceId}`}
                        className="text-primary-text hover:underline"
                      >
                        {titleOf(row)}
                      </Link>
                    ) : (
                      titleOf(row)
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-ink">
                    {formatCount(row.views)}
                  </td>
                  <td className="px-3 py-2 text-right text-ink">
                    {formatCount(row.visitors)}
                  </td>
                  <td className="px-3 py-2 text-right text-ink">
                    {row.avgEngagedMs === null ? "–" : formatDuration(row.avgEngagedMs)}
                  </td>
                  <td className="px-3 py-2 text-right text-ink">
                    {formatCount(row.entries)}
                  </td>
                  <td className="px-3 py-2 text-right text-ink">
                    {row.bounceRate === null ? "–" : formatPercent(row.bounceRate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
