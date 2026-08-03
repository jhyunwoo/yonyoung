import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import MotionReveal from "@/app/(home)/_components/motion-reveal";
import SectionShell from "@/app/(home)/_components/section-shell";
import HeroShowcase from "@/app/(home)/_components/hero-showcase";
import PageViewTracker from "@/app/_components/page-view-tracker";
import {
  flattenLinktreeItems,
  listPublicActivities,
  listPublicExhibitions,
  listPublicLinktrees,
  safeList,
} from "@/features/public/services/public-read-service";
import { shouldUseUnoptimizedImage } from "@/features/media/images/image-utils";
import { summarizeRichTextHtml } from "@/features/media/rich-text/rich-text";
import { resolveSiteUrl } from "@/features/seo/metadata/seo";
import JsonLd from "@/features/seo/structured-data/json-ld";
import { formatKoreanDateRange } from "@/shared/utils/date-formatters";

const getHomePrimaryData = async () => {
  return Promise.all([
    safeList(listPublicActivities, []),
    safeList(listPublicExhibitions, []),
  ]);
};

const getHomeQuickLinks = async () => {
  const linktrees = await safeList(listPublicLinktrees, []);
  return flattenLinktreeItems(linktrees).slice(0, 6);
};

const HomeQuickLinksSection = async () => {
  const quickLinks = await getHomeQuickLinks();

  return (
    <SectionShell
      id="quick-links"
      eyebrow="Quick Access"
      title="자주 찾는 링크"
      description="공식 링크와 커뮤니티 채널을 한 번에 연결합니다."
    >
      <div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        data-testid="home-quicklinks-grid"
      >
        {quickLinks.length === 0 ? (
          <div className="border border-(--surface-strong-border) bg-(--surface-elevated) p-6 text-sm text-(--text-muted)">
            공개 링크트리 항목이 없습니다.
          </div>
        ) : (
          quickLinks.map((item, index) => (
            <MotionReveal key={item.id} delay={index * 0.04} className="min-w-0 h-full">
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`home-quicklink-card-${item.id}`}
                className="group flex flex-col h-full min-w-0 border border-(--surface-border) bg-(--surface-elevated) p-4 transition hover:border-(--surface-strong-border) hover:bg-(--surface-muted)"
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-(--text-muted)">
                  {item.groupName}
                </p>
                {/* 공백 없는 긴 링크 이름이 좁은 화면에서 카드를 밀어내지
                    않도록 임의 위치에서 줄바꿈한다. */}
                <p className="mt-2 text-base font-semibold text-(--text-primary) wrap-anywhere">
                  {item.name}
                </p>
                <p className="mt-1 truncate text-xs text-(--text-muted)">{item.link}</p>
              </a>
            </MotionReveal>
          ))
        )}
      </div>

      <MotionReveal className="mt-8">
        <div className="border border-(--surface-strong-border) bg-(--surface-elevated) p-6 text-center">
          <p className="text-sm text-(--text-muted)">
            연영회의 더 많은 전시와 활동을 아카이브에서 확인해보세요.
          </p>
          <Link
            href="/archive/records"
            data-testid="home-cta-archive-bottom"
            className="pressable mt-4 inline-flex border border-(--surface-strong-border) px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-(--text-primary) transition hover:bg-(--text-primary) hover:text-white"
          >
            아카이브 보러가기
          </Link>
        </div>
      </MotionReveal>
    </SectionShell>
  );
};

export default async function HomePage() {
  const [activities, exhibitions] = await getHomePrimaryData();

  const recentActivities = activities.slice(0, 6);
  const siteUrl = resolveSiteUrl();
  const organizationId = `${siteUrl}/#organization`;
  const websiteId = `${siteUrl}/#website`;
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": organizationId,
    name: "연영회",
    alternateName: ["YonYoung", "연세대학교 중앙사진동아리 연영회"],
    url: siteUrl,
    logo: `${siteUrl}/android-chrome-512x512.png`,
    image: `${siteUrl}/android-chrome-512x512.png`,
    description:
      "1966년 창단한 연세대학교 중앙사진동아리로, 사진 촬영과 전시, 교류 활동을 이어가고 있습니다.",
    foundingDate: "1966",
    sameAs: ["https://www.instagram.com/yonyoungpage"],
    parentOrganization: {
      "@type": "CollegeOrUniversity",
      name: "연세대학교",
      url: "https://www.yonsei.ac.kr",
    },
  };
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": websiteId,
    name: "연영회",
    alternateName: ["YonYoung", "연세대학교 중앙사진동아리 연영회"],
    url: siteUrl,
    inLanguage: "ko-KR",
    publisher: {
      "@id": organizationId,
    },
  };

  return (
    <div className="pb-14 md:pb-20">
      <PageViewTracker pageType="home" />
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={websiteJsonLd} />
      <HeroShowcase
        featuredExhibition={exhibitions[0] ?? null}
        exhibitions={exhibitions}
        recentActivities={recentActivities}
      />

      <SectionShell
        id="recent-activities"
        eyebrow="Latest Activities"
        title="최근 활동 기록"
        description="가장 최근의 연영회 활동을 사진과 함께 확인해보세요."
      >
        <div
          className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="home-activities-grid"
        >
          {recentActivities.length === 0 ? (
            <div className="border border-(--surface-strong-border) bg-(--surface-elevated) p-6 text-sm text-(--text-muted)">
              아직 공개된 활동이 없습니다. 관리자에서 활동을 추가하면 여기에 반영됩니다.
            </div>
          ) : (
            recentActivities.map((activity, index) => (
              <MotionReveal key={activity.id} delay={index * 0.04} className="h-full">
                <Link
                  href={`/archive/records/${activity.id}`}
                  className="group flex flex-col h-full overflow-hidden border border-(--surface-strong-border) bg-(--surface-elevated) transition-transform duration-300 hover:scale-[1.03]"
                  data-testid={`home-activity-card-${activity.id}`}
                  aria-label={`${activity.title} 상세 보기`}
                >
                  <div className="relative shrink-0 aspect-4/3 overflow-hidden">
                    <Image
                      src={activity.coverImageUrl}
                      alt={activity.title}
                      fill
                      unoptimized={shouldUseUnoptimizedImage(activity.coverImageUrl)}
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="space-y-2 p-5">
                    <p className="text-xs font-semibold uppercase tracking-widest text-(--text-muted)">
                      {formatKoreanDateRange(activity.startDate, activity.endDate)}
                    </p>
                    <h3 className="text-[1.3rem] leading-tight tracking-[-0.02em] text-(--text-primary)">
                      {activity.title}
                    </h3>
                    <p className="line-clamp-2 text-sm leading-relaxed text-(--text-muted)">
                      {summarizeRichTextHtml(activity.description, 90)}
                    </p>
                  </div>
                </Link>
              </MotionReveal>
            ))
          )}
        </div>
      </SectionShell>

      <Suspense
        fallback={
          <SectionShell
            id="quick-links"
            eyebrow="Quick Access"
            title="자주 찾는 링크"
            description="공식 링크와 커뮤니티 채널을 한 번에 연결합니다."
          >
            <div className="h-36 animate-pulse border border-(--surface-strong-border) bg-(--surface-muted)" />
          </SectionShell>
        }
      >
        <HomeQuickLinksSection />
      </Suspense>
    </div>
  );
}
