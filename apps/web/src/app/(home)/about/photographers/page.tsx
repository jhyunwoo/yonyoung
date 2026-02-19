import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import MotionReveal from "../../components/motion-reveal";
import SectionShell from "../../components/section-shell";
import { listPublicPhotographers, safeList } from "../../../../lib/public-api";
import { createPageMetadata } from "../../../../lib/seo";
import { formatKoreanName } from "../../../../lib/user-name";
import AboutSubNav from "../components/about-subnav";

const yearFormatter = new Intl.DateTimeFormat("ko-KR", { year: "numeric" });

const readDisplayName = (member: {
  familyName: string | null;
  givenName: string | null;
  name: string;
}): string => {
  const koreanName = formatKoreanName({
    familyName: member.familyName,
    givenName: member.givenName,
  });
  if (koreanName !== "이름 미등록") {
    return koreanName;
  }

  const legacyName = member.name.trim();
  return legacyName.length > 0 ? legacyName : "이름 미등록";
};

const readFallbackInitial = (name: string): string => {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return "?";
  }
  return Array.from(trimmed)[0] ?? "?";
};

const formatYearRange = (startDate: number, endDate: number): string =>
  `${yearFormatter.format(startDate)} - ${yearFormatter.format(endDate)}`;

export const metadata: Metadata = createPageMetadata({
  title: "PHOTOGRAPHERS | 연영회",
  description:
    "연영회 기수별 사진가(멤버) 목록입니다. 데이터베이스에 등록된 기수/멤버 정보를 기반으로 표시합니다.",
  path: "/about/photographers",
  keywords: ["연영회", "Photographers", "연영회 멤버", "기수별 멤버"],
});

export default async function PhotographersPage() {
  const generations = await safeList(listPublicPhotographers, []);

  return (
    <div className="pb-16 md:pb-20" data-testid="about-photographers-page">
      <section className="px-4 pb-10 pt-14 md:px-6 md:pb-14 md:pt-18">
        <div className="mx-auto w-full max-w-6xl rounded-3xl border border-(--surface-border) bg-(--surface-elevated) p-6 shadow-[0_20px_70px_-42px_var(--shadow-strong)] md:p-10">
          <MotionReveal>
            <p className="text-xs uppercase tracking-[0.2em] text-(--text-muted)">
              About Members
            </p>
            <h1 className="mt-3 font-display text-4xl leading-tight text-(--text-primary) md:text-6xl">
              PHOTOGRAPHERS
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-(--text-secondary) md:text-base">
              연영회 기수별 멤버 목록입니다. 데이터베이스에 등록된 기수와 소속 멤버 정보를 기준으로
              표시합니다.
            </p>
          </MotionReveal>

          {generations.length > 0 ? (
            <MotionReveal className="mt-6" delay={0.05}>
              <nav aria-label="기수 바로가기" data-testid="about-photographers-nav">
                <ul className="flex flex-wrap gap-2">
                  {generations.map((generation) => (
                    <li key={`about-photographers-nav-${generation.id}`}>
                      <Link
                        href={`#gen-${generation.sortOrder}`}
                        className="inline-flex items-center rounded-full border border-(--surface-border) bg-(--surface-muted) px-3 py-1.5 text-sm text-(--text-secondary) transition hover:border-(--accent) hover:text-(--text-primary)"
                      >
                        {generation.sortOrder}기
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </MotionReveal>
          ) : null}
        </div>
      </section>

      <AboutSubNav active="photographers" />

      <SectionShell
        eyebrow="Members"
        title="기수별 멤버"
        description="각 기수 카드에서 소속 멤버를 확인할 수 있습니다."
      >
        {generations.length === 0 ? (
          <MotionReveal>
            <article className="rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-5 text-sm text-(--text-secondary)">
              공개된 기수 정보가 없습니다.
            </article>
          </MotionReveal>
        ) : (
          <div className="space-y-4" data-testid="about-photographers-generations">
            {generations.map((generation, generationIndex) => (
              <MotionReveal key={generation.id} delay={generationIndex * 0.03}>
                <article
                  id={`gen-${generation.sortOrder}`}
                  className="rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-5 md:p-6"
                  data-testid={`about-photographers-generation-${generation.id}`}
                >
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <h2 className="font-display text-3xl text-(--text-primary)">
                        {generation.sortOrder}기
                      </h2>
                      <p className="mt-1 text-sm text-(--text-secondary)">
                        {generation.name} · {formatYearRange(generation.startDate, generation.endDate)}
                      </p>
                    </div>
                    <span className="rounded-full border border-(--surface-border) bg-(--surface-muted) px-2.5 py-1 text-xs text-(--text-muted)">
                      {generation.members.length}명
                    </span>
                  </div>

                  {generation.members.length === 0 ? (
                    <p className="text-sm text-(--text-secondary)">등록된 멤버가 없습니다.</p>
                  ) : (
                    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {generation.members.map((member) => {
                        const displayName = readDisplayName(member);
                        const fallbackInitial = readFallbackInitial(displayName);

                        return (
                          <li
                            key={member.id}
                            className="rounded-xl border border-(--surface-border) bg-(--surface-elevated) p-3"
                            data-testid={`about-photographers-member-${member.id}`}
                          >
                            <div className="flex items-center gap-3">
                              {member.image ? (
                                <Image
                                  src={member.image}
                                  alt={`${displayName} 프로필`}
                                  width={48}
                                  height={48}
                                  className="h-12 w-12 rounded-full border border-(--surface-border) object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-(--surface-border) bg-(--surface-muted) text-sm font-semibold text-(--text-secondary)">
                                  {fallbackInitial}
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-semibold text-(--text-primary)">{displayName}</p>
                                <p className="text-xs text-(--text-muted)">{generation.sortOrder}기</p>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </article>
              </MotionReveal>
            ))}
          </div>
        )}
      </SectionShell>
    </div>
  );
}
