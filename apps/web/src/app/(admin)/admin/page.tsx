import Link from "next/link";
import { buildGenerationPath, getAccessibleGenerations } from "../../../lib/admin-generation";
import {
  fetchGenerationsFromServer,
  readServerCookieHeader,
} from "../../../lib/admin-generation-server";
import { fetchAdminDashboardStatsFromServer } from "../../../lib/admin-resource-server";
import { canManageGenerations, canManageGlobalUsers } from "../../../lib/auth-shared";
import { serverAuthTool } from "../../../lib/auth-server-tool";

type AdminPageProps = {
  searchParams: Promise<{
    generation?: string;
  }>;
};

const DEFAULT_DASHBOARD_STATS = {
  usersTotal: 0,
  unverifiedUsersTotal: 0,
  generationsTotal: 0,
  selectedGenerationMembersTotal: 0,
  selectedGenerationActivitiesTotal: 0,
  selectedGenerationExhibitionsTotal: 0,
  activeSupportersTotal: 0,
  linktreeLinksTotal: 0,
};

const parseGenerationSortOrder = (value: string | undefined): number | null => {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatCount = (value: number): string => value.toLocaleString("ko-KR");

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const session = await serverAuthTool.requireAdminPageAccess();
  await serverAuthTool.redirectIfProfileIncomplete(session);

  const cookieHeader = await readServerCookieHeader();
  const [query, generations] = await Promise.all([
    searchParams,
    fetchGenerationsFromServer(cookieHeader),
  ]);

  const accessibleGenerations = getAccessibleGenerations(session, generations);
  const requestedSortOrder = parseGenerationSortOrder(query.generation);
  const selectedGeneration =
    accessibleGenerations.find((generation) => generation.sortOrder === requestedSortOrder) ??
    accessibleGenerations[0] ??
    null;

  const dashboardStats =
    (await fetchAdminDashboardStatsFromServer(
      cookieHeader,
      selectedGeneration?.sortOrder ?? null,
    )) ?? DEFAULT_DASHBOARD_STATS;

  const generationCards = [
    {
      title: "선택 기수 멤버",
      value: dashboardStats.selectedGenerationMembersTotal,
      helper: selectedGeneration
        ? `${selectedGeneration.sortOrder}기 멤버 수`
        : "기수를 선택하면 표시됩니다.",
    },
    {
      title: "선택 기수 활동",
      value: dashboardStats.selectedGenerationActivitiesTotal,
      helper: selectedGeneration
        ? `${selectedGeneration.sortOrder}기 활동 수`
        : "기수를 선택하면 표시됩니다.",
    },
    {
      title: "선택 기수 전시",
      value: dashboardStats.selectedGenerationExhibitionsTotal,
      helper: selectedGeneration
        ? `${selectedGeneration.sortOrder}기 전시 수`
        : "기수를 선택하면 표시됩니다.",
    },
  ] as const;

  const globalCards = [
    {
      title: "전체 사용자",
      value: dashboardStats.usersTotal,
      helper: "등록된 전체 사용자",
    },
    {
      title: "미인증 사용자",
      value: dashboardStats.unverifiedUsersTotal,
      helper: "승인 대기 사용자",
    },
    {
      title: "운영 기수",
      value: dashboardStats.generationsTotal,
      helper: "생성된 기수 수",
    },
    {
      title: "활성 서포터즈",
      value: dashboardStats.activeSupportersTotal,
      helper: "만료일이 지나지 않은 서포터즈",
    },
    {
      title: "Linktree 링크",
      value: dashboardStats.linktreeLinksTotal,
      helper: "전체 링크 항목 수",
    },
  ] as const;

  return (
    <main className="space-y-6" data-testid="admin-dashboard-page">
      <header className="rounded-3xl border border-gray-200 bg-white p-5 md:p-6">
        <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">관리자 현황판</h1>
        <p className="mt-2 text-sm text-gray-600">
          전체 운영 상태와 선택 기수의 핵심 지표를 한 화면에서 확인할 수 있습니다.
        </p>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-gray-500">작업 기수 선택</p>
          {accessibleGenerations.length === 0 ? (
            <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              접근 가능한 기수가 없습니다. 권한 또는 소속 기수를 확인해 주세요.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2" data-testid="admin-dashboard-generation-filter">
              {accessibleGenerations.map((generation) => {
                const isActive = selectedGeneration?.id === generation.id;
                return (
                  <Link
                    key={generation.id}
                    href={`/admin?generation=${generation.sortOrder}`}
                    prefetch={false}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? "border-black bg-black text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                    data-testid={`admin-dashboard-generation-${generation.sortOrder}`}
                  >
                    {generation.sortOrder}기 ({generation.name})
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="admin-generation-kpis">
        {generationCards.map((card) => (
          <article key={card.title} className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-600">{card.title}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{formatCount(card.value)}</p>
            <p className="mt-1 text-xs text-gray-500">{card.helper}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" data-testid="admin-global-kpis">
        {globalCards.map((card) => (
          <article key={card.title} className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-600">{card.title}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{formatCount(card.value)}</p>
            <p className="mt-1 text-xs text-gray-500">{card.helper}</p>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-5 md:p-6">
        <h2 className="text-lg font-semibold text-gray-900">바로가기</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {selectedGeneration ? (
            <>
              <Link
                href={buildGenerationPath(selectedGeneration.sortOrder, "activities")}
                prefetch={false}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                {selectedGeneration.sortOrder}기 활동 관리
              </Link>
              <Link
                href={buildGenerationPath(selectedGeneration.sortOrder, "exhibitions")}
                prefetch={false}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                {selectedGeneration.sortOrder}기 전시 관리
              </Link>
              <Link
                href={buildGenerationPath(selectedGeneration.sortOrder, "users")}
                prefetch={false}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                {selectedGeneration.sortOrder}기 멤버 관리
              </Link>
            </>
          ) : null}

          <Link
            href="/admin/supporters"
            prefetch={false}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            서포터즈 관리
          </Link>
          <Link
            href="/admin/linktree"
            prefetch={false}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Linktree 관리
          </Link>
          {canManageGlobalUsers(session) ? (
            <Link
              href="/admin/users"
              prefetch={false}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              사용자 권한 관리
            </Link>
          ) : null}
          {canManageGenerations(session) ? (
            <Link
              href="/admin/generations"
              prefetch={false}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              기수 설정
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
