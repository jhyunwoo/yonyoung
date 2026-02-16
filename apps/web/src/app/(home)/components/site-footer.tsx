const currentYear = new Date().getFullYear();

/**
 * SiteFooter 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default function SiteFooter() {
  return (
    <footer
      className="border-t border-[var(--surface-border)] bg-[var(--surface-elevated)]"
      data-testid="public-footer"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 md:flex-row md:items-end md:justify-between md:px-6">
        <div>
          <p className="font-display text-2xl text-[var(--text-primary)]">연영회</p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            연세대학교 중앙사진동아리
          </p>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            One Step Closer to Your Light
          </p>
        </div>
        <div className="space-y-2 text-sm text-[var(--text-secondary)]">
          <p>Email: kimse0604@naver.com</p>
          <p>Instagram: @yonyoungpage</p>
          <p>Open Kakao: open.kakao.com/o/snVWZ4th</p>
          <p className="text-[var(--text-muted)]">© {currentYear} YeonYoungHoe</p>
        </div>
      </div>
    </footer>
  );
}
