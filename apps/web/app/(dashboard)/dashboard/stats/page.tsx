import { PageContainer } from "@/app/(dashboard)/_components/ui/layout-parts";
import { getAdminVisitorInsights } from "@/features/dashboard/services/admin-read-service";
import {
  kstToday,
  parseStatsSearchParams,
  toInsightsApiSearch,
} from "@/features/dashboard/stats/stats-range";
import { readCookieHeader } from "@/shared/http/http";
import StatsView from "./stats-view";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";

export const metadata = {
  title: "방문 통계 | 연영회 관리자",
};

type StatsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StatsPage({ searchParams }: StatsPageProps) {
  await serverAuthGuard.requireSession();
  // 날짜 입력의 max와 실시간 갱신 여부가 서버·클라이언트에서 같도록 오늘 날짜를 서버에서 정해 내려준다.
  const today = kstToday();
  const query = parseStatsSearchParams(await searchParams, today);
  const apiSearch = toInsightsApiSearch(query);
  const cookieHeader = await readCookieHeader();
  const result = await getAdminVisitorInsights(cookieHeader, apiSearch);
  const insights = result.ok ? result.data : null;
  const error = result.ok ? null : result.error.message;

  return (
    <PageContainer>
      {/* 기간·필터가 바뀌면 다시 마운트해 폴링 상태와 직접 지정 입력값을 새 조건으로 초기화한다. 지표는 화면 상태라 키에 넣지 않는다. */}
      <StatsView
        key={`${apiSearch}:${query.preset}`}
        query={query}
        today={today}
        insights={insights}
        error={error}
      />
    </PageContainer>
  );
}
