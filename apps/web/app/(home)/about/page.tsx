import type { Metadata } from "next";
import Link from "next/link";
import {
  listPublicGenerations,
  safeList,
} from "@/features/public/services/public-read-service";
import { formatKoreanYearRange } from "@/shared/utils/date-formatters";
import { createPageMetadata } from "@/features/seo/metadata/seo";
import PageTitleHero from "@/app/(home)/_components/page-title-hero";

const annualActivities = [
  { month: "March", title: "리크루팅" },
  { month: "May", title: "연세대학교 대동제 보도 사진전" },
  { month: "June", title: "MT" },
  { month: "August", title: "정기 사진전" },
  { month: "October", title: "정기연고전 보도 사진전" },
  { month: "February", title: "신인 사진전" },
];

export const metadata: Metadata = createPageMetadata({
  title: "연영회 소개 | 연세대학교 중앙사진동아리",
  description:
    "1966년부터 이어진 연세대학교 중앙사진동아리 연영회의 역사, 연간 활동, 기수 정보를 소개합니다.",
  path: "/about",
  keywords: ["연영회 소개", "연영회 역사", "연세대학교 동아리", "사진 동아리 활동"],
});

const getPublicGenerations = async () => {
  return safeList(listPublicGenerations, []);
};

/**
 * AboutPage 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default async function AboutPage() {
  const generations = await getPublicGenerations();
  const splitIndex = Math.ceil(annualActivities.length / 2);
  const activityColumns = [
    annualActivities.slice(0, splitIndex),
    annualActivities.slice(splitIndex),
  ];

  return (
    <div className="min-h-screen bg-(--bg-primary)">
      <div className="mx-auto max-w-300 px-4 md:px-8">
        <PageTitleHero
          title="연영회 소개"
          description="연영회는 1966년 창립한 연세대학교 중앙사진동아리입니다. 함께 배우고 촬영하며, 전시와 기록으로 서로의 시선을 나눕니다."
        />
      </div>
      <div
        className="mx-auto w-full max-w-[1200px] space-y-14 px-4 pb-16 md:px-8 md:pb-20"
        data-testid="about-page"
      >
        <section className="space-y-6" aria-labelledby="about-identity">
          <div className="max-w-3xl space-y-4">
            <h2
              id="about-identity"
              className="text-[2rem] font-semibold text-(--text-primary)"
            >
              사진으로 배우고, 기록하고, 전시합니다
            </h2>
            <p className="text-base leading-8 text-(--text-muted)">
              연영회는 사진 이론과 촬영, 보정 경험을 나누는 세미나와 정기 출사를
              진행합니다. 구성원이 직접 기획한 프로젝트와 작품은 대동제·연고전 보도사진전,
              정기 사진전과 신인 사진전을 통해 교내외 관람객에게 소개합니다.
            </p>
            <p className="text-base leading-8 text-(--text-muted)">
              기수와 전공에 관계없이 서로의 사진을 함께 보고 이야기하며, 동문과 다른 대학
              사진동아리와도 교류합니다. 촬영에서 전시까지 한 해의 과정을 함께 경험하는
              것이 연영회 활동의 중심입니다.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <article className="border border-(--surface-border) p-5">
              <h3 className="text-lg font-semibold text-(--text-primary)">
                세미나와 정기 출사
              </h3>
              <p className="mt-3 text-sm leading-7 text-(--text-muted)">
                사진 이론과 촬영법, 후보정 과정을 함께 배우고 서울 곳곳에서 정기 출사를
                진행합니다.
              </p>
              <Link
                href="/archive/records"
                className="mt-4 inline-flex text-sm font-semibold text-(--text-primary) underline underline-offset-4"
              >
                실제 활동 기록 보기
              </Link>
            </article>
            <article className="border border-(--surface-border) p-5">
              <h3 className="text-lg font-semibold text-(--text-primary)">
                사진전과 보도 기록
              </h3>
              <p className="mt-3 text-sm leading-7 text-(--text-muted)">
                정기전과 신인전, 교내 행사의 보도사진전을 기획하고 작품을 직접 선보입니다.
              </p>
              <Link
                href="/archive/exhibitions"
                className="mt-4 inline-flex text-sm font-semibold text-(--text-primary) underline underline-offset-4"
              >
                지난 전시회 보기
              </Link>
            </article>
            <article className="border border-(--surface-border) p-5">
              <h3 className="text-lg font-semibold text-(--text-primary)">
                새로운 사진가와의 만남
              </h3>
              <p className="mt-3 text-sm leading-7 text-(--text-muted)">
                매년 새 기수를 모집해 사진을 매개로 배우고 기록할 구성원을 맞이합니다.
              </p>
              <Link
                href="/about/recruiting"
                className="mt-4 inline-flex text-sm font-semibold text-(--text-primary) underline underline-offset-4"
              >
                리크루팅 안내 보기
              </Link>
            </article>
          </div>
        </section>

        <section className="space-y-6" data-testid="about-annual-activities">
          <h2 className="text-[2rem] font-semibold text-(--text-primary)">연간 활동</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {activityColumns.map((column, index) => (
              <article
                key={`about-activities-${index}`}
                className="border border-(--surface-border) p-5"
              >
                <ul className="space-y-4">
                  {column.map((activity) => (
                    <li
                      key={`${activity.month}-${activity.title}`}
                      className="flex items-start justify-between gap-4 border-b border-(--surface-border) pb-3 last:border-none last:pb-0"
                    >
                      <span className="text-sm font-semibold tracking-[0.04em] text-(--text-primary)">
                        {activity.month}
                      </span>
                      <span className="text-right text-sm text-(--text-muted)">
                        {activity.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-6" data-testid="about-history">
          <h2 className="text-[2rem] font-semibold text-(--text-primary)">연혁</h2>
          <div className="space-y-3 border-l border-(--surface-border) pl-4">
            <article className="border border-(--surface-border) p-4">
              <p className="text-sm font-semibold text-(--text-primary)">1966</p>
              <p className="text-sm text-(--text-muted)">연영회 창단</p>
            </article>

            {generations.map((generation) => (
              <article
                key={generation.id}
                className="border border-(--surface-border) p-4"
                data-testid={`about-generation-card-${generation.id}`}
              >
                <p className="text-sm font-semibold text-(--text-primary)">
                  {generation.name}
                </p>
                <p className="text-sm text-(--text-muted)">
                  {formatKoreanYearRange(generation.startDate, generation.endDate)}
                </p>
              </article>
            ))}

            {generations.length === 0 ? (
              <article className="border border-(--surface-border) p-4 text-sm text-(--text-muted)">
                공개된 기수 정보가 없습니다.
              </article>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
