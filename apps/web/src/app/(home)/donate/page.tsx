import type { Metadata } from "next";
import MotionReveal from "../components/motion-reveal";
import SectionShell from "../components/section-shell";
import { createPageMetadata } from "../../../lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "DONATE US | 연영회",
  description:
    "연영회 후원 안내, 후원 방법, 후원금 사용 내역, 문의 정보를 확인하세요.",
  path: "/donate",
  keywords: ["연영회 후원", "DONATE US", "연영회 후원 안내", "후원금 사용 내역"],
});

/**
 * DonatePage 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default function DonatePage() {
  return (
    <div className="pb-16 md:pb-20">
      <section className="px-4 pb-8 pt-14 md:px-6 md:pb-12 md:pt-18">
        <div className="mx-auto w-full max-w-6xl rounded-3xl border border-(--surface-border) bg-(--surface-elevated) p-6 md:p-10">
          <MotionReveal>
            <p className="text-xs uppercase tracking-[0.2em] text-(--text-muted)">
              DONATE US
            </p>
            <h1 className="mt-3 font-display text-4xl leading-tight text-(--text-primary) md:text-6xl">
              DONATE US
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-(--text-secondary) md:text-base">
              연영회 후원 안내
            </p>
          </MotionReveal>
        </div>
      </section>

      <SectionShell
        eyebrow="Donation Guide"
        title="후원 안내"
        description="연영회는 여러분의 후원으로 더 나은 활동을 이어갈 수 있습니다."
      >
        <MotionReveal>
          <article className="rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-5 md:p-6">
            <p className="text-sm leading-relaxed text-(--text-secondary) md:text-base">
              연영회는 여러분의 후원으로 더 나은 활동을 이어갈 수 있습니다. 후원금은
              전시회 개최, 장비 구매, 워크샵 운영 등에 사용됩니다.
            </p>
          </article>
        </MotionReveal>
      </SectionShell>

      <SectionShell
        eyebrow="How To Donate"
        title="후원 방법"
        description="계좌 이체와 온라인 후원으로 참여할 수 있습니다."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              title: "계좌 이체",
              body: [
                "은행: 예시은행",
                "계좌번호: 123-456-789012",
                "예금주: 연영회",
              ],
            },
            {
              title: "온라인 후원",
              body: ["온라인 후원 시스템을 통해 후원하실 수 있습니다."],
              buttonLabel: "후원하기",
            },
          ].map((item, index) => (
            <MotionReveal key={item.title} delay={index * 0.05}>
              <article className="h-full rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-5">
                <h2 className="font-display text-3xl text-(--text-primary)">
                  {item.title}
                </h2>
                <div className="mt-3 space-y-1.5">
                  {item.body.map((line) => (
                    <p key={line} className="text-sm leading-relaxed text-(--text-secondary)">
                      {line}
                    </p>
                  ))}
                </div>
                {"buttonLabel" in item ? (
                  <button
                    type="button"
                    className="mt-4 inline-flex rounded-full bg-(--accent) px-4 py-2 text-sm font-medium text-(--accent-foreground) transition hover:opacity-90"
                  >
                    {item.buttonLabel}
                  </button>
                ) : null}
              </article>
            </MotionReveal>
          ))}
        </div>
      </SectionShell>

      <SectionShell
        eyebrow="Usage"
        title="후원금 사용 내역"
        description="후원금은 아래 활동 영역에 사용됩니다."
        className="bg-(--surface-elevated)/60"
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "전시회 개최",
              body: "갤러리 대관 및 전시 준비 비용",
            },
            {
              title: "장비 구매",
              body: "카메라, 렌즈 등 촬영 장비 구매",
            },
            {
              title: "워크숍 운영",
              body: "사진 기술 교육 및 워크샵 비용",
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
        description="후원 관련 문의사항이 있으시면 언제든지 연락주세요."
      >
        <MotionReveal>
          <article className="rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-5">
            <p className="text-sm text-(--text-secondary)">
              이메일: donate@yeonyeonghoe.com
            </p>
            <p className="mt-1 text-sm text-(--text-secondary)">
              전화: 010-0000-0000
            </p>
          </article>
        </MotionReveal>
      </SectionShell>
    </div>
  );
}
