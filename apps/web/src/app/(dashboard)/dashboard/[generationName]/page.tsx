import Link from "next/link";
import type { ApiActivity, ApiExhibition } from "@repo/shared-api-contracts";
import { formatKoreanDate, formatKoreanDateRange } from "../../../../lib/date-formatters";
import {
  listPublicActivities,
  listPublicExhibitions,
  listPublicPhotographers,
  safeList,
} from "../../../../lib/public-api";
import { requireDashboardGeneration } from "./_lib/resolve-generation";
import GenerationNoticeOverview from "./generation-notice-overview";

const sortByStartDateDesc = <T extends { startDate: number }>(list: T[]): T[] =>
  [...list].sort((left, right) => right.startDate - left.startDate);

export default async function GenerationDashboardPage({
  params,
}: Readonly<{
  params: Promise<{ generationName: string }>;
}>) {
  const generation = await requireDashboardGeneration(params);
  const [activities, exhibitions, photographerGenerations] = await Promise.all([
    safeList(listPublicActivities, [] as ApiActivity[]),
    safeList(listPublicExhibitions, [] as ApiExhibition[]),
    safeList(listPublicPhotographers, []),
  ]);

  const generationActivities = sortByStartDateDesc(
    activities.filter((activity) => activity.generationId === generation.id),
  );
  const generationExhibitions = sortByStartDateDesc(
    exhibitions.filter((exhibition) => exhibition.generationId === generation.id),
  );
  const generationMembers =
    photographerGenerations.find((item) => item.id === generation.id)?.members ?? [];
  const recentActivities = generationActivities.slice(0, 4);
  const recentExhibitions = generationExhibitions.slice(0, 3);

  const latestUpdateTimestamp = Math.max(
    generationActivities[0]?.startDate ?? 0,
    generationExhibitions[0]?.startDate ?? 0,
  );

  const items = [
    {
      title: "공지 관리",
      description: "해당 기수의 공지를 작성하고 수정합니다.",
      href: `${generation.path}/notices`,
    },
    {
      title: "활동 관리",
      description: "해당 기수의 활동 정보를 관리합니다.",
      href: `${generation.path}/activities`,
    },
    {
      title: "전시 관리",
      description: "해당 기수의 전시 정보를 관리합니다.",
      href: `${generation.path}/exhibitions`,
    },
    {
      title: "멤버 관리",
      description: "해당 기수 소속 멤버를 관리합니다.",
      href: `${generation.path}/members`,
    },
  ];

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto grid w-full max-w-6xl gap-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">Generation Overview</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">{generation.name}</h1>
          <p className="mt-2 text-sm text-slate-500">
            활동 기간: {formatKoreanDateRange(generation.startDate, generation.endDate)}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
            해당 기수의 공지, 최근 활동, 최근 전시 등 핵심 정보를 한눈에 확인할 수 있습니다.
          </p>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <li className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">기수 멤버</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{generationMembers.length}</p>
              <p className="text-xs text-slate-500">명</p>
            </li>
            <li className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">활동</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{generationActivities.length}</p>
              <p className="text-xs text-slate-500">건</p>
            </li>
            <li className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">전시</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{generationExhibitions.length}</p>
              <p className="text-xs text-slate-500">건</p>
            </li>
            <li className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">최근 업데이트</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {latestUpdateTimestamp > 0 ? formatKoreanDate(latestUpdateTimestamp) : "-"}
              </p>
            </li>
          </ul>
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <GenerationNoticeOverview
            generationId={generation.id}
            generationPath={generation.path}
          />

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-lg font-bold text-slate-900">최근 활동</h2>
            {recentActivities.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                최근 활동 정보가 없습니다.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {recentActivities.map((activity) => (
                  <li
                    key={activity.id}
                    className="rounded-lg border border-slate-200 px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-slate-900">{activity.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatKoreanDateRange(activity.startDate, activity.endDate)}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <h3 className="mt-6 text-sm font-semibold text-slate-900">최근 전시</h3>
            {recentExhibitions.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                최근 전시 정보가 없습니다.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {recentExhibitions.map((exhibition) => (
                  <li
                    key={exhibition.id}
                    className="rounded-lg border border-slate-200 px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-slate-900">{exhibition.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatKoreanDateRange(exhibition.startDate, exhibition.endDate)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">바로가기</h2>
            <span className="text-xs text-slate-500">기수 관리 메뉴</span>
          </div>

          <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
                >
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
