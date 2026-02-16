import Link from "next/link";
import MotionReveal from "./components/motion-reveal";
import SectionShell from "./components/section-shell";
import HeroShowcase from "./components/hero-showcase";
import {
  flattenLinktreeItems,
  listPublicActivities,
  listPublicExhibitions,
  listPublicLinktrees,
  listPublicSupporters,
  safeList,
} from "../../lib/public-api";

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

  const featuredExhibition = exhibitions[0] ?? null;
  const recentActivities = activities.slice(0, 6);
  const highlightedSupporters = supporters.slice(0, 8);
  const quickLinks = flattenLinktreeItems(linktrees).slice(0, 6);

  return (
    <div className="pb-14 md:pb-20">
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="home-activities-grid">
          {recentActivities.length === 0 ? (
            <div className="rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-6 text-sm text-(--text-secondary)">
              아직 공개된 활동이 없습니다. 관리자에서 활동을 추가하면 여기에 반영됩니다.
            </div>
          ) : (
            recentActivities.map((activity, index) => (
              <MotionReveal key={activity.id} delay={index * 0.04}>
                <article
                  className="group overflow-hidden rounded-2xl border border-(--surface-border) bg-(--surface-elevated) shadow-[0_22px_50px_-36px_var(--shadow-strong)]"
                  data-testid={`home-activity-card-${activity.id}`}
                >
                  <div className="relative aspect-[5/4] overflow-hidden">
                    <img
                      src={activity.coverImageUrl}
                      alt={activity.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="space-y-2 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-(--text-muted)">
                      {formatDate(activity.activityDate)}
                    </p>
                    <h3 className="font-display text-2xl text-(--text-primary)">
                      {activity.title}
                    </h3>
                    <p className="line-clamp-2 text-sm leading-relaxed text-(--text-secondary)">
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
        className="bg-(--surface-elevated)/60"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="home-supporters-grid">
          {highlightedSupporters.length === 0 ? (
            <div className="rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-6 text-sm text-(--text-secondary)">
              현재 공개된 후원사 정보가 없습니다.
            </div>
          ) : (
            highlightedSupporters.map((supporter, index) => (
              <MotionReveal key={supporter.id} delay={index * 0.03}>
                <a
                  href={supporter.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`home-supporter-card-${supporter.id}`}
                  className="group flex h-full flex-col justify-between rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-4 transition hover:-translate-y-1 hover:border-(--accent)"
                >
                  <div className="mb-4 flex h-12 items-center justify-center overflow-hidden rounded-xl bg-(--surface-muted) px-3">
                    <img
                      src={supporter.logoUrl}
                      alt={supporter.name}
                      className="max-h-8 w-auto object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-(--text-primary)">
                      {supporter.name}
                    </p>
                  </div>
                </a>
              </MotionReveal>
            ))
          )}
        </div>
      </SectionShell>

      <SectionShell
        id="quick-links"
        eyebrow="Quick Access"
        title="자주 찾는 링크"
        description="공식 링크와 커뮤니티 채널을 한 번에 연결합니다."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="home-quicklinks-grid">
          {quickLinks.length === 0 ? (
            <div className="rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-6 text-sm text-(--text-secondary)">
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
                  className="group block rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-4 transition hover:border-(--accent) hover:bg-(--surface-muted)"
                >
                  <p className="text-xs uppercase tracking-[0.14em] text-(--text-muted)">
                    {item.groupName}
                  </p>
                  <p className="mt-2 text-base font-semibold text-(--text-primary)">
                    {item.name}
                  </p>
                  <p className="mt-1 truncate text-xs text-(--text-secondary)">
                    {item.link}
                  </p>
                </a>
              </MotionReveal>
            ))
          )}
        </div>

        <MotionReveal className="mt-8">
          <div className="rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-6 text-center">
            <p className="text-sm text-(--text-secondary)">
              연영회의 더 많은 전시와 활동을 아카이브에서 확인해보세요.
            </p>
            <Link
              href="/archive"
              data-testid="home-cta-archive-bottom"
              className="mt-4 inline-flex rounded-full bg-(--accent) px-5 py-2.5 text-sm font-medium text-(--accent-foreground) transition hover:opacity-90"
            >
              아카이브 보러가기
            </Link>
          </div>
        </MotionReveal>
      </SectionShell>
    </div>
  );
}
