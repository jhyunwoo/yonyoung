import MotionReveal from "../components/motion-reveal";
import SectionShell from "../components/section-shell";
import { listPublicSupporters, safeList } from "../../../lib/public-api";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

/**
 * DonatePage 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default async function DonatePage() {
  const supporters = await safeList(listPublicSupporters, []);

  return (
    <div className="pb-16 md:pb-20">
      <section className="px-4 pb-8 pt-14 md:px-6 md:pb-12 md:pt-18">
        <div className="mx-auto w-full max-w-6xl rounded-3xl border border-(--surface-border) bg-(--surface-elevated) p-6 md:p-10">
          <MotionReveal>
            <p className="text-xs uppercase tracking-[0.2em] text-(--text-muted)">
              Donate & Partner
            </p>
            <h1 className="mt-3 font-display text-4xl leading-tight text-(--text-primary) md:text-6xl">
              연영회의 전시와 기록을 함께 만들어주세요
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-(--text-secondary) md:text-base">
              후원과 제휴는 학생들이 더 많은 기록과 전시를 시도할 수 있게 만드는
              실질적인 힘이 됩니다.
            </p>
          </MotionReveal>
        </div>
      </section>

      <SectionShell
        eyebrow="Donate Guide"
        title="후원 안내"
        description="연영회의 전시, 기록, 교육 활동은 후원과 제휴를 통해 확장됩니다."
      >
        <MotionReveal>
          <article className="rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-5 md:p-6">
            <p className="text-sm leading-relaxed text-(--text-secondary) md:text-base">
              후원금과 협력 자원은 정기전 운영, 촬영/인화 장비 운영, 워크숍 준비와
              같은 실제 활동에 사용됩니다. 동아리 운영진과 함께 지속 가능한 사진
              프로젝트를 만들어갈 파트너를 기다리고 있습니다.
            </p>
          </article>
        </MotionReveal>
      </SectionShell>

      <SectionShell
        eyebrow="How To Support"
        title="후원 방법"
        description="아래 채널을 통해 제휴 및 후원 문의를 남겨주세요."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "기업 제휴",
              body: "촬영 장비, 조명, 인화/전시 분야 협업을 환영합니다.",
            },
            {
              title: "전시 스폰서십",
              body: "정기전/신인전 현장 브랜딩 및 협찬 프로그램을 운영합니다.",
            },
            {
              title: "문의 채널",
              body: "Email: kimse0604@naver.com · Open Kakao 링크를 통해 문의해주세요.",
            },
          ].map((item, index) => (
            <MotionReveal key={item.title} delay={index * 0.05}>
              <article className="rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-5">
                <h2 className="font-display text-3xl text-(--text-primary)">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-(--text-secondary)">
                  {item.body}
                </p>
              </article>
            </MotionReveal>
          ))}
        </div>
      </SectionShell>

      <SectionShell
        eyebrow="Usage"
        title="후원금 사용 내역"
        description="후원 자원은 아래와 같은 활동 영역에 우선 투입됩니다."
        className="bg-(--surface-elevated)/60"
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "전시회 개최",
              body: "갤러리 대관, 설치물 제작, 현장 운영 인프라에 사용됩니다.",
            },
            {
              title: "장비/인화 지원",
              body: "촬영 장비 유지와 인화·프린트 결과물 제작 비용에 반영됩니다.",
            },
            {
              title: "워크숍 운영",
              body: "신입/재학생 대상 교육 세션과 실습 프로그램 운영에 사용됩니다.",
            },
          ].map((item, index) => (
            <MotionReveal key={item.title} delay={index * 0.05}>
              <article className="rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-5">
                <h2 className="font-display text-3xl text-(--text-primary)">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-(--text-secondary)">
                  {item.body}
                </p>
              </article>
            </MotionReveal>
          ))}
        </div>
      </SectionShell>

      <SectionShell
        eyebrow="Contact"
        title="문의"
        description="후원/제휴 관련 상세 협의가 필요하면 아래 채널로 연락해주세요."
      >
        <MotionReveal>
          <article className="rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-5">
            <p className="text-sm text-(--text-secondary)">
              Email: kimse0604@naver.com
            </p>
            <p className="mt-1 text-sm text-(--text-secondary)">
              Open Kakao 링크는 Linktree 페이지에서 확인할 수 있습니다.
            </p>
          </article>
        </MotionReveal>
      </SectionShell>

      <SectionShell
        eyebrow="Current Partners"
        title="현재 후원사"
        description="현재 연영회와 함께하고 있는 파트너입니다."
        className="bg-(--surface-elevated)/60"
      >
        <div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          data-testid="donate-supporters"
        >
          {supporters.length === 0 ? (
            <MotionReveal>
              <div className="rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-6 text-sm text-(--text-secondary)">
                공개된 후원사 정보가 없습니다.
              </div>
            </MotionReveal>
          ) : (
            supporters.map((supporter, index) => (
              <MotionReveal key={supporter.id} delay={index * 0.03}>
                <a
                  href={supporter.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`donate-supporter-card-${supporter.id}`}
                  className="group block rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-4 transition hover:border-(--accent)"
                >
                  <div className="mb-4 flex h-12 items-center justify-center rounded-xl bg-(--surface-muted) px-3">
                    <img
                      src={supporter.logoUrl}
                      alt={supporter.name}
                      className="max-h-8 w-auto object-contain"
                    />
                  </div>
                  <p className="text-sm font-medium text-(--text-primary)">
                    {supporter.name}
                  </p>
                  <p className="mt-1 text-xs text-(--text-muted)">
                    만료일 {dateFormatter.format(supporter.expiresAt)}
                  </p>
                </a>
              </MotionReveal>
            ))
          )}
        </div>
      </SectionShell>
    </div>
  );
}
