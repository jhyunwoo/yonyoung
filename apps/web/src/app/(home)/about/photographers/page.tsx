import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { listPublicPhotographers, safeList } from "../../../../lib/public-api";
import { createPageMetadata } from "../../../../lib/seo";
import { formatKoreanName } from "../../../../lib/user-name";

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
    <div className="px-4 pb-16 pt-10 md:px-8 md:pb-20" data-testid="about-photographers-page">
      <main className="mx-auto w-full max-w-[1200px] space-y-10">
        <section className="space-y-5">
          <h1 className="text-[2.6rem] leading-tight font-semibold text-(--text-primary) md:text-[3.2rem]">
            PHOTOGRAPHERS
          </h1>
          {generations.length > 0 ? (
            <nav aria-label="기수 바로가기">
              <ul className="flex flex-wrap gap-2">
                {generations.map((generation) => (
                  <li key={`photographers-anchor-${generation.id}`}>
                    <Link
                      href={`#gen-${generation.sortOrder}`}
                      className="inline-flex border border-(--surface-border) px-3 py-1.5 text-sm text-(--text-primary) transition hover:bg-(--surface-muted)"
                    >
                      {generation.sortOrder}기
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </section>

        {generations.length === 0 ? (
          <section className="border border-(--surface-border) p-5 text-sm text-(--text-muted)">
            공개된 기수 정보가 없습니다.
          </section>
        ) : (
          <section className="space-y-8" data-testid="about-photographers-generations">
            {generations.map((generation) => (
              <article
                key={generation.id}
                id={`gen-${generation.sortOrder}`}
                className="space-y-4 border border-(--surface-border) p-5"
                data-testid={`about-photographers-generation-${generation.id}`}
              >
                <div className="space-y-1">
                  <h2 className="text-[1.6rem] font-semibold text-(--text-primary)">
                    {generation.sortOrder}기
                  </h2>
                  <p className="text-sm text-(--text-muted)">
                    {generation.name} · {formatYearRange(generation.startDate, generation.endDate)}
                  </p>
                </div>

                {generation.members.length === 0 ? (
                  <p className="text-sm text-(--text-muted)">등록된 멤버가 없습니다.</p>
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {generation.members.map((member) => {
                      const displayName = readDisplayName(member);
                      const fallbackInitial = readFallbackInitial(displayName);
                      return (
                        <li
                          key={member.id}
                          className="border border-(--surface-border) p-3"
                          data-testid={`about-photographers-member-${member.id}`}
                        >
                          <div className="space-y-2">
                            <div className="relative aspect-square overflow-hidden border border-(--surface-border) bg-(--surface-muted)">
                              {member.image ? (
                                <Image
                                  src={member.image}
                                  alt={`${displayName} 프로필`}
                                  fill
                                  unoptimized
                                  sizes="(min-width: 1024px) 14vw, (min-width: 768px) 24vw, 44vw"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-(--text-muted)">
                                  {fallbackInitial}
                                </div>
                              )}
                            </div>
                            <p className="text-sm font-medium text-(--text-primary)">{displayName}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
