import type { Metadata } from "next";
import { createPageMetadata } from "../../../../lib/seo";

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

export const metadata: Metadata = createPageMetadata({
  title: "RECRUITING | 연영회",
  description:
    "연영회 리크루팅 안내 페이지입니다. 모집 일정, 지원 자격, 지원 방법, 문의 정보를 확인할 수 있습니다.",
  path: "/about/recruiting",
  keywords: ["연영회 리크루팅", "연영회 모집", "동아리 모집", "RECRUITING"],
});

export default function RecruitingPage() {
  return (
    <div
      className="px-4 pb-16 md:px-8 md:pb-20"
      data-testid="about-recruiting-page"
    >
      <main className="mx-auto w-full max-w-300 space-y-10">
        <section className="space-y-3">
          <h1 className="text-[2.6rem] leading-tight font-semibold text-(--text-primary) md:text-[3.2rem]">
            RECRUITING
          </h1>
          <p className="text-base text-(--text-muted)">연영회 모집 안내</p>
        </section>

        <section className="space-y-3 border border-(--surface-border) p-5">
          <h2 className="text-[1.7rem] font-semibold text-(--text-primary)">
            모집 안내
          </h2>
          <p className="text-sm text-(--text-muted)">
            연영회는 연 1회, 3월 중 리크루팅을 실시합니다.
          </p>
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
                  <p className="text-sm text-(--text-muted)">
                    {step.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          className="space-y-3 border border-(--surface-border) p-5"
          data-testid="about-recruiting-contact"
        >
          <h2 className="text-[1.7rem] font-semibold text-(--text-primary)">
            문의
          </h2>
          <p className="text-sm text-(--text-muted)">
            기타 문의사항이 있으시면 언제든지 연락주세요.
          </p>
          <div className="space-y-1 text-sm text-(--text-muted)">
            <p>이메일: kimse0604@naver.com</p>
            <p>전화: 010-6814-1800</p>
          </div>
        </section>
      </main>
    </div>
  );
}
