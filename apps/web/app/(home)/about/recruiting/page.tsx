import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { createPageMetadata } from "@/features/seo/metadata/seo";
import { PAGE_SEO } from "@/features/seo/metadata/page-seo";
import { getPublicCurrentRecruitingPlan } from "@/features/public/services/public-read-service";
import {
  HIGH_CONTRAST_RICH_TEXT_CLASS_NAMES,
  RichTextContent,
} from "@/features/media/rich-text/rich-text-content";
import PageTitleHero from "@/app/(home)/_components/page-title-hero";

const qualificationItems = [
  "사진에 대한 열정과 관심이 있는 분",
  "정기 활동 참여가 가능한 분",
  "1년 동안 사진을 정말로 즐기실 분",
];

const applicationSteps = [
  {
    title: "지원서 작성",
    description: "지원서를 작성하여 제출해주세요.",
  },
  {
    title: "면접",
    description: "지원서 검토 후 면접을 진행합니다.",
  },
  {
    title: "합격 통보",
    description: "합격자에게 개별적으로 연락드립니다.",
  },
];

export const metadata: Metadata = createPageMetadata(PAGE_SEO.recruiting);

const koreanDateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Seoul",
});

const formatKoreanDateTime = (timestampMs: number): string => {
  return koreanDateTimeFormatter.format(timestampMs);
};

type RecruitingStatus = "upcoming" | "open" | "closed";

const readRecruitingStatus = (
  nowTimestampMs: number,
  startAt: number,
  endAt: number,
): RecruitingStatus => {
  if (nowTimestampMs < startAt) {
    return "upcoming";
  }
  if (nowTimestampMs > endAt) {
    return "closed";
  }
  return "open";
};

const STATUS_BADGE_CLASS =
  "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold";

const RECRUITING_STATUS_META: Record<
  RecruitingStatus,
  { label: string; className: string }
> = {
  upcoming: {
    label: "모집 예정",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  open: {
    label: "모집중",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  closed: {
    label: "모집 마감",
    className: "border-slate-300 bg-slate-100 text-slate-700",
  },
};

/**
 * 모집 상태 배지 — 이 페이지에서 요청 시각이 필요한 **유일한** 조각이다.
 *
 * 예전에는 페이지 최상단에서 `await headers()` 를 불러 라우트 전체를 요청 시점
 * 렌더로 만들었다. 그러면 제목·모집 안내·지원 자격·지원 방법처럼 완전히 정적인
 * 부분까지 셸 밖으로 밀려나고, 그 자리를 라우트 그룹 공용 `loading.tsx`(홈 모양
 * 스켈레톤)가 대신 채웠다 — 리크루팅 페이지인데 홈 스켈레톤이 보였다.
 *
 * "지금"이 필요한 곳만 이 컴포넌트로 좁혀서, 나머지는 전부 App Shell 에 남긴다.
 */
async function RecruitingStatusBadge({
  startAt,
  endAt,
}: {
  startAt: number;
  endAt: number;
}) {
  // 요청 시점 렌더로 확정한다. `Date.now()` 를 읽는 근거가 이 한 줄이다.
  await headers();
  const status = readRecruitingStatus(
    // 서버 컴포넌트이고 위에서 동적 렌더링으로 확정됐으므로 요청 시각을 읽는 것이
    // 맞다. 클라이언트 렌더 규칙을 보는 react-hooks/purity 는 여기에 해당하지 않는다.
    // eslint-disable-next-line react-hooks/purity
    Date.now(),
    startAt,
    endAt,
  );
  const meta = RECRUITING_STATUS_META[status];

  return <span className={`${STATUS_BADGE_CLASS} ${meta.className}`}>{meta.label}</span>;
}

/**
 * Instant Navigation 계약 (Next.js 16.3).
 *
 * 이 라우트로 이동할 때 요청 시점 작업을 기다리지 않고 곧바로 의미 있는 UI 가
 * 나와야 한다는 선언이다. 빌드가 이를 검증하므로, 나중에 누군가 이 트리 위쪽에서
 * `cookies()` · `headers()` · `await params` · 캐시되지 않은 fetch 를 하면 빌드가
 * 깨진다 — 성능 회귀가 리뷰가 아니라 CI 에서 잡힌다.
 */
export const instant = true;

export default async function RecruitingPage() {
  const currentRecruitingPlan = await getPublicCurrentRecruitingPlan();

  return (
    <div className="min-h-screen bg-(--bg-primary)" data-testid="about-recruiting-page">
      <div className="mx-auto max-w-300 px-4 md:px-8">
        <PageTitleHero title="RECRUITING" description="연영회 모집 안내" />
        <div className="mx-auto w-full max-w-300 space-y-10 pb-16 md:pb-20">
          <section className="space-y-3 border border-(--surface-border) p-5">
            <h2 className="text-[1.7rem] font-semibold text-(--text-primary)">
              모집 안내
            </h2>
            <p className="text-sm text-(--text-muted)">
              연영회는 연 1회, 3월 중 리크루팅을 실시합니다.
            </p>
          </section>

          <section
            className="space-y-4 border border-(--surface-border) p-5"
            data-testid="about-recruiting-plan"
          >
            <h2 className="text-[1.7rem] font-semibold text-(--text-primary)">
              올해 모집 계획
            </h2>

            {currentRecruitingPlan ? (
              <article className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-semibold text-(--text-primary)">
                    {currentRecruitingPlan.title}
                  </h3>
                  <Suspense
                    fallback={
                      <span
                        className={`${STATUS_BADGE_CLASS} border-(--surface-border) bg-(--surface-muted) text-transparent`}
                        aria-hidden="true"
                      >
                        모집 상태
                      </span>
                    }
                  >
                    <RecruitingStatusBadge
                      startAt={currentRecruitingPlan.recruitmentStartAt}
                      endAt={currentRecruitingPlan.recruitmentEndAt}
                    />
                  </Suspense>
                </div>

                <p className="text-sm text-(--text-muted)">
                  모집 기간:{" "}
                  {formatKoreanDateTime(currentRecruitingPlan.recruitmentStartAt)} ~{" "}
                  {formatKoreanDateTime(currentRecruitingPlan.recruitmentEndAt)}
                </p>

                <RichTextContent
                  html={currentRecruitingPlan.content}
                  className={`${HIGH_CONTRAST_RICH_TEXT_CLASS_NAMES} recruiting-rich-text-contrast`}
                />

                {currentRecruitingPlan.promotionImageUrls.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {currentRecruitingPlan.promotionImageUrls.map((imageUrl, index) => (
                      <div
                        key={`${imageUrl}-${index + 1}`}
                        className="overflow-hidden border border-(--surface-border) bg-(--surface-base)"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrl}
                          alt={`모집 홍보 이미지 ${index + 1}`}
                          className="block h-auto w-full"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            ) : (
              <div
                className="border border-(--surface-border) bg-(--surface-base) p-4 text-sm text-(--text-muted)"
                data-testid="about-recruiting-plan-empty"
              >
                올해 모집 계획 준비 중입니다.
              </div>
            )}
          </section>

          <section className="space-y-3 border border-(--surface-border) p-5">
            <h2 className="text-[1.7rem] font-semibold text-(--text-primary)">
              지원 자격
            </h2>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-(--text-muted)">
              {qualificationItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-3 border border-(--surface-border) p-5">
            <h2 className="text-[1.7rem] font-semibold text-(--text-primary)">
              지원 방법
            </h2>
            <div className="space-y-3" data-testid="about-recruiting-steps">
              {applicationSteps.map((step, index) => (
                <article
                  key={step.title}
                  className="flex gap-3 border border-(--surface-border) p-3"
                >
                  <div className="inline-flex h-7 w-7 shrink-0 items-center justify-center border border-(--surface-border) text-sm font-semibold text-(--text-primary)">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-(--text-primary)">
                      {step.title}
                    </h3>
                    <p className="text-sm text-(--text-muted)">{step.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
