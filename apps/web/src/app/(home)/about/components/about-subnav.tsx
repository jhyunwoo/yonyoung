import Link from "next/link";

type AboutSection = "about" | "photographers" | "recruiting";

type AboutSubNavProps = {
  active: AboutSection;
};

const aboutTabs: Array<{ id: AboutSection; label: string; href: string }> = [
  {
    id: "about",
    label: "연영회 소개",
    href: "/about",
  },
  {
    id: "photographers",
    label: "Photographers",
    href: "/about/photographers",
  },
  {
    id: "recruiting",
    label: "Recruiting",
    href: "/about/recruiting",
  },
];

/**
 * AboutSubNav 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @param props 함수 로직에서 사용하는 입력값입니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default function AboutSubNav({ active }: AboutSubNavProps) {
  return (
    <section className="px-4 pb-6 md:px-6 md:pb-8" data-testid="about-subnav">
      <div className="mx-auto w-full max-w-6xl">
        <nav aria-label="About 섹션 이동">
          <ul className="flex flex-wrap gap-2">
            {aboutTabs.map((tab) => {
              const isActive = tab.id === active;
              return (
                <li key={tab.id}>
                  <Link
                    href={tab.href}
                    data-testid={`about-subnav-${tab.id}`}
                    className={[
                      "inline-flex rounded-full px-4 py-2 text-sm transition",
                      isActive
                        ? "bg-(--accent) text-(--accent-foreground)"
                        : "border border-(--surface-border) bg-(--surface-elevated) text-(--text-secondary) hover:border-(--accent) hover:text-(--text-primary)",
                    ].join(" ")}
                  >
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </section>
  );
}
