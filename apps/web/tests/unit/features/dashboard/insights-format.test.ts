import { describe, expect, it } from "vitest";
import type { ApiVisitorInsights } from "@yonyoung/contracts";
import {
  formatDuration,
  formatPercent,
  insightsCsvFileName,
  insightsTrendToCsv,
  referrerLabel,
} from "@/features/dashboard/stats/insights-format";

describe("insights-format", () => {
  it("체류 시간을 초·분으로 쓴다", () => {
    expect(formatDuration(0)).toBe("0초");
    expect(formatDuration(42_400)).toBe("42초");
    expect(formatDuration(60_000)).toBe("1분");
    expect(formatDuration(95_000)).toBe("1분 35초");
  });

  it("비율을 소수 한 자리 퍼센트로 쓴다", () => {
    expect(formatPercent(0.6667)).toBe("66.7%");
  });

  it("유입 경로 예약어를 한국어로 바꾼다", () => {
    expect(referrerLabel("direct")).toBe("직접 접속");
    expect(referrerLabel("other")).toBe("기타");
    expect(referrerLabel("google.com")).toBe("google.com");
  });

  it("추이 CSV는 BOM·CRLF와 모든 지표 열을 담는다", () => {
    const insights = {
      range: {
        from: "2026-10-01",
        to: "2026-10-02",
        days: 2,
        granularity: "day",
      },
      previousRange: { from: "2026-09-29", to: "2026-09-30" },
      trend: [
        {
          bucket: "2026-10-01",
          views: 10,
          visitors: 4,
          sessions: 5,
          avgSessionMs: 61_000,
          newVisitors: 3,
          returningVisitors: 1,
          prevViews: 8,
          prevVisitors: 3,
          prevSessions: 4,
          prevAvgSessionMs: 30_000,
          collected: true,
        },
      ],
    } as unknown as ApiVisitorInsights;

    const csv = insightsTrendToCsv(insights);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("\r\n");
    expect(csv).toContain(
      "구간,페이지뷰,방문자,세션,평균 체류(초),신규 방문자,재방문 방문자,이전 페이지뷰,이전 방문자,이전 세션,이전 평균 체류(초),수집 여부",
    );
    expect(csv).toContain("2026-10-01,10,4,5,61,3,1,8,3,4,30,수집");
    expect(insightsCsvFileName(insights)).toBe(
      "visitor-insights_2026-10-01_2026-10-02_day.csv",
    );
  });
});
