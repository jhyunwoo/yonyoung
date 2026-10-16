"use client";

import type { ApiVisitorInsights } from "@yonyoung/contracts";
import { SankeyChart, SankeyLink, SankeyNode, SankeyTooltip } from "@/components/charts";
import {
  toPathSankey,
  toReferrerSankey,
  type SankeyData,
} from "@/features/dashboard/stats/insights-chart-data";
import {
  formatCount,
  NEUTRAL_COLOR,
  PAGE_TYPE_COLOR,
  PAGE_TYPE_LABEL,
  referrerLabel,
} from "@/features/dashboard/stats/insights-format";
import ChartCard from "./chart-card";

const LABEL_TO_COLOR = new Map<string, string>(
  (Object.keys(PAGE_TYPE_LABEL) as Array<keyof typeof PAGE_TYPE_LABEL>).map((type) => [
    PAGE_TYPE_LABEL[type],
    PAGE_TYPE_COLOR[type],
  ]),
);

// 노드 이름 끝의 페이지 종류로 색을 고른다. 유입 경로·이탈은 중립색이다.
const nodeColor = (name: string) =>
  LABEL_TO_COLOR.get(name.split(": ").pop() ?? name) ?? NEUTRAL_COLOR;

const Flow = ({ data }: { data: SankeyData }) => (
  // 좁은 화면에서 열 사이 라벨이 겹치지 않도록 최소 폭을 두고 가로로 스크롤한다.
  <div className="overflow-x-auto">
    <div className="min-w-[40rem]">
      <SankeyChart
        data={data}
        aspectRatio="16 / 7"
        nodePadding={16}
        // 기본 여백(좌우 180px)은 카드 폭에서 그림 영역을 거의 남기지 않는다. 라벨 길이에 맞춰 줄인다.
        margin={{ top: 16, right: 120, bottom: 16, left: 120 }}
      >
        <SankeyLink getNodeColor={(node) => nodeColor(String(node.name))} />
        <SankeyNode getNodeColor={(node) => nodeColor(String(node.name))} />
        <SankeyTooltip formatValue={(value) => `${formatCount(value)}세션`} />
      </SankeyChart>
    </div>
  </div>
);

export function ReferrerFlowCard({ insights }: { insights: ApiVisitorInsights }) {
  return (
    <ChartCard
      testId="stats-referrer-flow"
      title="유입 경로 → 진입 페이지"
      description="세션 기준, 상위 6개 밖은 기타"
      empty={
        insights.referrerFlow.length === 0
          ? "이 기간·조건에 기록된 세션이 없습니다."
          : null
      }
      table={{
        columns: ["유입 경로", "진입 페이지", "세션"],
        rows: insights.referrerFlow.map((row) => [
          referrerLabel(row.referrer),
          PAGE_TYPE_LABEL[row.landing],
          formatCount(row.sessions),
        ]),
      }}
    >
      <Flow data={toReferrerSankey(insights.referrerFlow)} />
    </ChartCard>
  );
}

export function PathFlowCard({ insights }: { insights: ApiVisitorInsights }) {
  const pageLabel = (page: keyof typeof PAGE_TYPE_LABEL | "exit") =>
    page === "exit" ? "이탈" : PAGE_TYPE_LABEL[page];
  return (
    <ChartCard
      testId="stats-path-flow"
      title="세션 이동 경로"
      description="진입 → 2번째 → 3번째 페이지, 각 단계의 이탈 포함"
      empty={
        insights.pathFlow.length === 0 ? "이 기간·조건에 기록된 세션이 없습니다." : null
      }
      table={{
        columns: ["단계", "이전 페이지", "다음 페이지", "세션"],
        rows: insights.pathFlow.map((row) => [
          row.step === 1 ? "진입 → 2번째" : "2번째 → 3번째",
          pageLabel(row.from),
          pageLabel(row.to),
          formatCount(row.sessions),
        ]),
      }}
    >
      <Flow data={toPathSankey(insights.pathFlow)} />
    </ChartCard>
  );
}
