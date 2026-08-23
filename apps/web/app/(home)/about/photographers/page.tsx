import Link from "next/link";
import type { Metadata } from "next";
import {
  listPublicPhotographers,
  safeList,
} from "@/features/public/services/public-read-service";
import { formatKoreanYearRange } from "@/shared/utils/date-formatters";
import { createPageMetadata } from "@/features/seo/metadata/seo";
import { PAGE_SEO } from "@/features/seo/metadata/page-seo";
import GenerationMembersGrid from "@/app/(home)/about/photographers/generation-members-grid";

export const metadata: Metadata = createPageMetadata(PAGE_SEO.photographers);

/**
 * Instant Navigation 계약 (Next.js 16.3).
 *
 * 이 라우트로 이동할 때 요청 시점 작업을 기다리지 않고 곧바로 의미 있는 UI 가
 * 나와야 한다는 선언이다. 빌드가 이를 검증하므로, 나중에 누군가 이 트리 위쪽에서
 * `cookies()` · `headers()` · `await params` · 캐시되지 않은 fetch 를 하면 빌드가
 * 깨진다 — 성능 회귀가 리뷰가 아니라 CI 에서 잡힌다.
 */
export const instant = true;

export default async function PhotographersPage() {
  const generations = await safeList(listPublicPhotographers, []);

  return (
    <div
      className="bg-(--bg-primary) pb-14 md:pb-20 md:pt-10"
      data-testid="about-photographers-page"
    >
      <div
        className="mx-auto w-full max-w-300 space-y-10 px-4 md:space-y-20 md:px-8"
        data-testid="about-photographers-main"
      >
        <section className="space-y-6 pt-6 md:space-y-10 md:pt-10">
          <h1 className="text-4xl leading-none font-normal tracking-[-0.02em] text-(--text-primary) md:text-6xl">
            PHOTOGRAPHERS
          </h1>
          {generations.length > 0 ? (
            <nav aria-label="기수 바로가기">
              <ul className="flex flex-wrap items-center gap-x-6 gap-y-1 md:gap-x-8 md:gap-y-2">
                {generations.map((generation) => (
                  <li key={`photographers-anchor-${generation.id}`}>
                    <Link
                      href={`#gen-${generation.sortOrder}`}
                      className="inline-flex text-base leading-tight font-normal text-(--text-muted) transition-colors hover:text-(--text-primary) md:text-lg"
                    >
                      {generation.sortOrder}기
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
          <div className="h-px w-full bg-(--surface-border)" />
        </section>

        {generations.length === 0 ? (
          <section className="border border-(--surface-border) p-5 text-sm text-(--text-muted)">
            공개된 기수 정보가 없습니다.
          </section>
        ) : (
          <section
            className="space-y-12 md:space-y-16"
            data-testid="about-photographers-generations"
          >
            {generations.map((generation) => (
              <article
                key={generation.id}
                id={`gen-${generation.sortOrder}`}
                className="scroll-mt-[calc(var(--public-header-height-mobile)+16px)] space-y-6 md:scroll-mt-[calc(var(--public-header-height-desktop)+40px)] md:space-y-8"
                data-testid={`about-photographers-generation-${generation.id}`}
              >
                <header>
                  <div className="inline-flex flex-col items-start">
                    <h2 className="text-xl leading-none font-medium tracking-tight text-(--text-primary) md:text-2xl underline underline-offset-4  ">
                      {generation.sortOrder}기
                    </h2>
                  </div>
                  <p className="sr-only">
                    {generation.name} ·{" "}
                    {formatKoreanYearRange(generation.startDate, generation.endDate)}
                  </p>
                </header>

                {generation.members.length === 0 ? (
                  <p className="text-sm text-(--text-muted)">등록된 멤버가 없습니다.</p>
                ) : (
                  <GenerationMembersGrid generation={generation} />
                )}
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
