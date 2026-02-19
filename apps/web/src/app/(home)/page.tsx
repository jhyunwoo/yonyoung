import Image from "next/image";
import Link from "next/link";
import MotionReveal from "./components/motion-reveal";
import SectionShell from "./components/section-shell";
import HeroShowcase from "./components/hero-showcase";
import SupporterGrid from "./components/supporter-grid";
import {
  flattenLinktreeItems,
  listPublicActivities,
  listPublicExhibitions,
  listPublicLinktrees,
  listPublicSupporters,
  safeList,
} from "../../lib/public-api";
import { shouldUseUnoptimizedImage } from "../../lib/image-utils";
import { pickFeaturedPublicExhibition } from "../../lib/public-exhibition";
import { resolveSiteUrl } from "../../lib/seo";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const formatDate = (value: number): string => dateFormatter.format(value);

/**
 * HomePage 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default async function HomePage() {
  const [activities, exhibitions, supporters, linktrees] = await Promise.all([
    safeList(listPublicActivities, []),
    safeList(listPublicExhibitions, []),
    safeList(listPublicSupporters, []),
    safeList(listPublicLinktrees, []),
  ]);

  const featuredExhibition = pickFeaturedPublicExhibition(exhibitions);
  const recentActivities = activities.slice(0, 6);
  const highlightedSupporters = supporters.slice(0, 8);
  const quickLinks = flattenLinktreeItems(linktrees).slice(0, 6);
  const siteUrl = resolveSiteUrl();
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "연영회",
    alternateName: "YonYoungHoe",
    url: siteUrl,
    sameAs: quickLinks.map((item) => item.link),
  };
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "연영회",
    url: siteUrl,
  };

  return (
    <div className="pb-14 md:pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteJsonLd),
        }}
      />
      <HeroShowcase
        featuredExhibition={featuredExhibition}
        recentActivities={recentActivities}
      />

      <SectionShell
        id="recent-activities"
        eyebrow="Latest Activities"
        title="최근 활동 기록"
        description="가장 최근의 연영회 활동을 사진과 함께 확인해보세요."
      >
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3" data-testid="home-activities-grid">
          {recentActivities.length === 0 ? (
            <div className="border border-(--surface-strong-border) bg-(--surface-elevated) p-6 text-sm text-(--text-muted)">
              아직 공개된 활동이 없습니다. 관리자에서 활동을 추가하면 여기에 반영됩니다.
            </div>
          ) : (
            recentActivities.map((activity, index) => (
              <MotionReveal key={activity.id} delay={index * 0.04}>
                <article
                  className="group overflow-hidden border border-(--surface-strong-border) bg-(--surface-elevated) transition-transform duration-300 hover:scale-[1.03]"
                  data-testid={`home-activity-card-${activity.id}`}
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
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
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-(--text-muted)">
                      {formatDate(activity.activityDate)}
                    </p>
                    <h3 className="font-display text-[1.3rem] leading-tight text-(--text-primary)">
                      {activity.title}
                    </h3>
                    <p className="line-clamp-2 text-sm leading-relaxed text-(--text-muted)">
                      {activity.description}
                    </p>
                  </div>
                </article>
              </MotionReveal>
            ))
          )}
        </div>
      </SectionShell>

      <SectionShell
        id="sponsors"
        eyebrow="Supporters"
        title="연영회를 함께 만드는 후원사"
        description="연영회의 활동과 전시를 함께 만들어주시는 파트너입니다."
        className="bg-(--surface-elevated)"
      >
        <SupporterGrid
          supporters={highlightedSupporters}
          emptyMessage="현재 공개된 후원사 정보가 없습니다."
          containerTestId="home-supporters-grid"
          cardTestIdPrefix="home-supporter-card"
        />
      </SectionShell>

      <SectionShell
        id="quick-links"
        eyebrow="Quick Access"
        title="자주 찾는 링크"
        description="공식 링크와 커뮤니티 채널을 한 번에 연결합니다."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="home-quicklinks-grid">
          {quickLinks.length === 0 ? (
            <div className="border border-(--surface-strong-border) bg-(--surface-elevated) p-6 text-sm text-(--text-muted)">
              공개 링크트리 항목이 없습니다.
            </div>
          ) : (
            quickLinks.map((item, index) => (
              <MotionReveal key={item.id} delay={index * 0.04}>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`home-quicklink-card-${item.id}`}
                  className="group block border border-(--surface-border) bg-(--surface-elevated) p-4 transition hover:border-(--surface-strong-border) hover:bg-(--surface-muted)"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-(--text-muted)">
                    {item.groupName}
                  </p>
                  <p className="mt-2 text-base font-semibold text-(--text-primary)">
                    {item.name}
                  </p>
                  <p className="mt-1 truncate text-xs text-(--text-muted)">
                    {item.link}
                  </p>
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
              className="mt-4 inline-flex border border-(--surface-strong-border) px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-(--text-primary) transition hover:bg-(--text-primary) hover:text-white"
            >
              아카이브 보러가기
            </Link>
          </div>
        </MotionReveal>
      </SectionShell>
    </div>
  );
}
