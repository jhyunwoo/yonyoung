import Link from "next/link";

type ArchiveSection = "records" | "supporters" | "exhibitions";

type ArchiveSubNavProps = {
  active: ArchiveSection;
};

const archiveTabs: Array<{ id: ArchiveSection; label: string; href: string }> = [
  {
    id: "records",
    label: "활동 기록",
    href: "/archive/records",
  },
  {
    id: "supporters",
    label: "서포터즈",
    href: "/archive/supporters",
  },
  {
    id: "exhibitions",
    label: "전시 아카이브",
    href: "/archive/exhibitions",
  },
];

/**
 * ArchiveSubNav 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @param props 함수 로직에서 사용하는 입력값입니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default function ArchiveSubNav({ active }: ArchiveSubNavProps) {
  return (
    <section className="px-4 pb-6 md:px-6 md:pb-8" data-testid="archive-subnav">
      <div className="mx-auto w-full max-w-6xl">
        <nav aria-label="아카이브 섹션 이동">
          <ul className="flex flex-wrap gap-2">
            {archiveTabs.map((tab) => {
              const isActive = tab.id === active;
              return (
                <li key={tab.id}>
                  <Link
                    href={tab.href}
                    data-testid={`archive-subnav-${tab.id}`}
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
