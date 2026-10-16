import type { ApiVisitorInsights } from "@yonyoung/contracts";
import { formatCount, formatPercent } from "@/features/dashboard/stats/insights-format";
import ChartCard from "./chart-card";

const WEEKS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

// 순차 스케일 5단계. 0%와 null(아직 오지 않은 주)은 구분해서 보여 준다.
const levelOf = (rate: number) => Math.min(4, Math.floor(rate * 5));
const LEVEL_BG = [
  "bg-(--chart-scale-01)",
  "bg-(--chart-scale-02)",
  "bg-(--chart-scale-03)",
  "bg-(--chart-scale-04)",
  "bg-(--chart-scale-05)",
] as const;
// 진한 두 단계는 흰 글자로 대비를 맞춘다.
const LEVEL_TEXT = [
  "text-ink",
  "text-ink",
  "text-ink",
  "text-white",
  "text-white",
] as const;

export default function CohortCard({ insights }: { insights: ApiVisitorInsights }) {
  return (
    <ChartCard
      testId="stats-cohorts"
      title="주별 재방문 코호트"
      description="첫 방문 주(월요일 시작)별로 1~8주 뒤 다시 온 방문자 비율. 빈칸은 아직 오지 않은 주"
      empty={
        insights.cohorts.length === 0 ? "이 기간에 처음 방문한 방문자가 없습니다." : null
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-separate border-spacing-0.5 text-caption tabular-nums">
          <thead className="text-ink-muted">
            <tr>
              <th scope="col" className="px-2 py-1 text-left font-medium">
                첫 방문 주
              </th>
              <th scope="col" className="px-2 py-1 text-right font-medium">
                방문자
              </th>
              {WEEKS.map((week) => (
                <th key={week} scope="col" className="px-2 py-1 text-center font-medium">
                  {week}주 후
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {insights.cohorts.map((cohort) => (
              <tr key={cohort.week}>
                <th scope="row" className="px-2 py-1 text-left font-normal text-ink">
                  {cohort.week}
                </th>
                <td className="px-2 py-1 text-right text-ink">
                  {formatCount(cohort.size)}
                </td>
                {cohort.retention.map((rate, index) => (
                  <td
                    key={WEEKS[index]}
                    className={
                      rate === null
                        ? "rounded-xs px-2 py-1 text-center text-ink-muted"
                        : `rounded-xs px-2 py-1 text-center ${LEVEL_BG[levelOf(rate)]} ${LEVEL_TEXT[levelOf(rate)]}`
                    }
                  >
                    {rate === null ? "–" : formatPercent(rate)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}
