"use client";

import type { ApiVisitorInsights } from "@yonyoung/contracts";
import { Ring, RingCenter, RingChart } from "@/components/charts";
import {
  DEVICE_COLOR,
  DEVICE_LABEL,
  formatCount,
  formatPercent,
} from "@/features/dashboard/stats/insights-format";
import ChartCard from "./chart-card";

type Slice = { label: string; value: number; color: string };

const RingBlock = ({
  title,
  slices,
  unit,
}: {
  title: string;
  slices: Slice[];
  unit: string;
}) => {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const data = slices.map((slice) => ({ ...slice, maxValue: total }));
  return (
    <figure className="flex flex-col items-center gap-3">
      <RingChart data={data} size={160} strokeWidth={12}>
        {data.map((slice, index) => (
          <Ring index={index} key={slice.label} color={slice.color} />
        ))}
        {/* 기본 NumberFlow는 서버(텍스트)와 클라이언트(커스텀 엘리먼트) 출력이 달라 하이드레이션이 깨진다. */}
        <RingCenter defaultLabel={title}>
          {({ value, label }) => (
            <div className="flex flex-col items-center text-center">
              <span className="text-body font-semibold text-ink tabular-nums">
                {formatCount(value)}
              </span>
              <span className="text-caption text-ink-muted">{label}</span>
            </div>
          )}
        </RingCenter>
      </RingChart>
      {/* 범례에 숫자와 비율을 함께 써서 색 없이도 읽힌다. */}
      <figcaption className="w-full">
        <ul className="flex flex-col gap-1 text-caption">
          {slices.map((slice) => (
            <li key={slice.label} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-ink">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: slice.color }}
                />
                {slice.label}
              </span>
              <span className="tabular-nums text-ink-muted">
                {formatCount(slice.value)}
                {unit} · {total === 0 ? "0%" : formatPercent(slice.value / total)}
              </span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
};

export default function CompositionCard({ insights }: { insights: ApiVisitorInsights }) {
  const deviceSlices = (["mobile", "desktop", "tablet"] as const).map((device) => ({
    label: DEVICE_LABEL[device],
    value: insights.devices.find((row) => row.device === device)?.sessions ?? 0,
    color: DEVICE_COLOR[device],
  }));
  const sessions = insights.audience.member + insights.audience.external;

  return (
    <ChartCard
      testId="stats-composition"
      title="구성 비율"
      description="기기·방문자 구분은 세션, 신규/재방문은 방문자 기준"
      empty={sessions === 0 ? "이 기간·조건에 기록된 세션이 없습니다." : null}
    >
      <div className="grid gap-6 sm:grid-cols-3">
        <RingBlock title="기기" unit="회" slices={deviceSlices} />
        <RingBlock
          title="방문자 구분"
          unit="회"
          slices={[
            {
              label: "외부 방문자",
              value: insights.audience.external,
              color: "var(--chart-1)",
            },
            {
              label: "회원",
              value: insights.audience.member,
              color: "var(--chart-2)",
            },
          ]}
        />
        <RingBlock
          title="신규/재방문"
          unit="명"
          slices={[
            {
              label: "신규",
              value: insights.summary.newVisitors,
              color: "var(--chart-1)",
            },
            {
              label: "재방문",
              value: insights.summary.returningVisitors,
              color: "var(--chart-3)",
            },
          ]}
        />
      </div>
    </ChartCard>
  );
}
