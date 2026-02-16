import MotionReveal from "../components/motion-reveal";
import SectionShell from "../components/section-shell";
import {
  flattenLinktreeItems,
  listPublicLinktrees,
  safeList,
} from "../../../lib/public-api";

/**
 * LinktreePage 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default async function LinktreePage() {
  const linktrees = await safeList(listPublicLinktrees, []);
  const groupedItems = linktrees.map((group) => ({
    id: group.id,
    name: group.name,
    items: flattenLinktreeItems([group]),
  }));

  return (
    <div className="pb-16 md:pb-20">
      <section className="px-4 pb-8 pt-14 md:px-6 md:pb-12 md:pt-18">
        <div className="mx-auto w-full max-w-6xl rounded-3xl border border-(--surface-border) bg-(--surface-elevated) p-6 md:p-10">
          <MotionReveal>
            <p className="text-xs uppercase tracking-[0.2em] text-(--text-muted)">
              Linktree
            </p>
            <h1 className="mt-3 font-display text-4xl leading-tight text-(--text-primary) md:text-6xl">
              연영회 공식 링크 모음
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-(--text-secondary) md:text-base">
              인스타그램, 문의 채널, 활동 관련 외부 링크를 한 곳에서 확인할 수 있습니다.
            </p>
          </MotionReveal>
        </div>
      </section>

      <SectionShell
        eyebrow="Official Links"
        title="카테고리별 바로가기"
        description="각 그룹에서 필요한 링크를 빠르게 열어보세요."
      >
        <div className="space-y-6" data-testid="linktree-groups">
          {groupedItems.length === 0 ? (
            <MotionReveal>
              <div className="rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-6 text-sm text-(--text-secondary)">
                공개된 링크 그룹이 없습니다.
              </div>
            </MotionReveal>
          ) : (
            groupedItems.map((group, groupIndex) => (
              <MotionReveal key={group.id} delay={groupIndex * 0.06}>
                <section
                  className="rounded-2xl border border-(--surface-border) bg-(--surface-elevated) p-5"
                  data-testid={`linktree-group-card-${group.id}`}
                >
                  <h2 className="font-display text-3xl text-(--text-primary)">
                    {group.name}
                  </h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {group.items.map((item, itemIndex) => (
                      <MotionReveal
                        key={item.id}
                        delay={Math.min(itemIndex * 0.03, 0.2)}
                      >
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid={`linktree-item-card-${item.id}`}
                          className="block rounded-xl border border-(--surface-border) bg-(--surface-muted) px-4 py-3 transition hover:-translate-y-0.5 hover:border-(--accent)"
                        >
                          <p className="text-sm font-medium text-(--text-primary)">
                            {item.name}
                          </p>
                          <p className="mt-1 truncate text-xs text-(--text-secondary)">
                            {item.link}
                          </p>
                        </a>
                      </MotionReveal>
                    ))}
                  </div>
                </section>
              </MotionReveal>
            ))
          )}
        </div>
      </SectionShell>
    </div>
  );
}
