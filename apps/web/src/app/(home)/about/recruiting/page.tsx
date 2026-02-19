import type { Metadata } from "next";
import MotionReveal from "../../components/motion-reveal";
import SectionShell from "../../components/section-shell";
import { createPageMetadata } from "../../../../lib/seo";
import AboutSubNav from "../components/about-subnav";

const qualificationItems = [
  "사진에 대한 열정과 관심",
  "정기적인 활동 참여 가능",
  "다른 멤버들과의 협력과 소통",
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

export const metadata: Metadata = createPageMetadata({
  title: "RECRUITING | 연영회",
  description:
    "연영회 리크루팅 안내 페이지입니다. 모집 일정, 지원 자격, 지원 방법, 문의 정보를 확인할 수 있습니다.",
  path: "/about/recruiting",
  keywords: ["연영회 리크루팅", "연영회 모집", "동아리 모집", "RECRUITING"],
});

export default function RecruitingPage() {
  return (
    <div className="pb-16 md:pb-20" data-testid="about-recruiting-page">
      <section className="px-4 pb-10 pt-14 md:px-6 md:pb-14 md:pt-18">
        <div className="mx-auto w-full max-w-6xl rounded-3xl border border-(--surface-border) bg-(--surface-elevated) p-6 shadow-[0_20px_70px_-42px_var(--shadow-strong)] md:p-10">
          <MotionReveal>
            <p className="text-xs uppercase tracking-[0.2em] text-(--text-muted)">
              Membership
            </p>
            <h1 className="mt-3 font-display text-4xl leading-tight text-(--text-primary) md:text-6xl">
              RECRUITING
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-(--text-secondary) md:text-base">
              연영회 모집 안내
            </p>
          </MotionReveal>
        </div>
      </section>

      <AboutSubNav active="recruiting" />

      <SectionShell eyebrow="Guide" title="모집 안내">
        <MotionReveal>
          <article className="rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-5 md:p-6">
            <p className="text-sm leading-relaxed text-(--text-secondary) md:text-base">
              연영회는 연 1회, 3월 중 리크루팅을 실시합니다.
            </p>
          </article>
        </MotionReveal>
      </SectionShell>

      <SectionShell eyebrow="Eligibility" title="지원 자격">
        <MotionReveal>
          <article className="rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-5 md:p-6">
            <ul className="space-y-2" data-testid="about-recruiting-qualification-list">
              {qualificationItems.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-(--text-secondary)">
                  <span className="mt-[0.45rem] h-1.5 w-1.5 rounded-full bg-(--accent)" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </MotionReveal>
      </SectionShell>

      <SectionShell
        eyebrow="How To Apply"
        title="지원 방법"
        description="아래 절차에 따라 지원을 진행해 주세요."
      >
        <div className="grid gap-4 md:grid-cols-3" data-testid="about-recruiting-steps">
          {applicationSteps.map((step, index) => (
            <MotionReveal key={step.title} delay={index * 0.05}>
              <article className="h-full rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-5">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-(--accent) text-sm font-semibold text-(--accent-foreground)">
                  {index + 1}
                </div>
                <h3 className="mt-3 text-lg font-semibold text-(--text-primary)">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-(--text-secondary)">{step.description}</p>
              </article>
            </MotionReveal>
          ))}
        </div>
      </SectionShell>

      <SectionShell eyebrow="Contact" title="문의">
        <MotionReveal>
          <article className="rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-5 md:p-6" data-testid="about-recruiting-contact">
            <p className="text-sm leading-relaxed text-(--text-secondary)">
              기타 문의사항이 있으시면 언제든지 연락주세요.
            </p>
            <div className="mt-3 space-y-1 text-sm text-(--text-secondary)">
              <p>이메일: kimse0604@naver.com</p>
              <p>전화: 010-6814-1800</p>
            </div>
          </article>
        </MotionReveal>
      </SectionShell>
    </div>
  );
}
