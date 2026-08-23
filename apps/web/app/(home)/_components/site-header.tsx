import Link from "next/link";
import { Suspense } from "react";
import SiteHeaderNav from "./site-header-nav";
import SiteHeaderScrollState from "./site-header-scroll-state";

/**
 * 공개 사이트 헤더 — 서버 컴포넌트다.
 *
 * 헤더 프레임과 로고는 상호작용이 전혀 없으므로 서버 HTML 로만 내보낸다.
 * 클라이언트로 내려가는 것은 두 개의 작은 아일랜드뿐이다.
 *   - `SiteHeaderScrollState` : 스크롤 여부를 `<html data-public-scrolled>` 로 알린다
 *   - `SiteHeaderNav`         : 경로 기반 활성 표시 · 드롭다운 · 모바일 메뉴 · 테마 전환
 *
 * 로고를 `next/image` 가 아니라 CSS 배경으로 그리는 이유:
 *   ① 라이트/다크에 따라 다른 파일을 쓰는데, `<img>` 두 장을 두면 감춰진 쪽까지
 *      브라우저가 받아 간다(다크 17KB / 라이트 36KB). CSS 배경은 매칭된 규칙만 받는다.
 *   ② 어느 쪽을 쓸지 알려면 확정된 테마가 필요한데, 그 값을 React 로 읽는 순간
 *      헤더 전체가 다시 클라이언트 컴포넌트가 된다. `.dark` 클래스는
 *      `public/theme-init.js` 가 첫 페인트 전에 붙여 두므로 CSS 는 JS 없이도 맞는
 *      로고를 고르고 깜빡임도 없다.
 *   ③ 커스텀 로더는 `/public` 자산을 변환 없이 그대로 통과시키므로(CLAUDE.md 참고)
 *      `next/image` 를 써도 얻는 것이 없다.
 *
 * `SiteHeaderNav` 를 `<Suspense>` 로 감싸는 것은 **필수**다. 그 안에서 쓰는
 * `usePathname()` 은 cacheComponents 에서 URL 데이터 접근으로 취급되고, 경계가
 * 없으면 프리렌더된 엔트리가 무효화된 뒤의 런타임 렌더가 통째로 500 으로 떨어진다.
 * 빌드는 통과하므로 e2e 없이는 드러나지 않는다 — 실제로 그렇게 한 번 놓쳤다.
 *
 * 경계를 헤더 전체가 아니라 내비 아일랜드에만 두는 것이 요점이다. 예전에는 레이아웃이
 * 헤더 전체를 Suspense 로 감싸고 빈 자리표시자를 폴백으로 줘서, App Shell 에 헤더가
 * 아예 없었다. 지금은 프레임·로고·배경이 셸에 남고 내비만 스트리밍된다.
 *
 * 폴백이 `null` 인 이유: 내비는 헤더 오른쪽 끝(justify-between)이라 없어도 로고
 * 위치가 움직이지 않는다. 즉 CLS 가 생기지 않는다.
 */
export default function SiteHeader() {
  return (
    <>
      <SiteHeaderScrollState />
      <header
        className={[
          // 스크롤 시 실제로 바뀌는 것은 테두리와 그림자뿐이다. transition-all 이면
          // 배경색까지 전환 대상이 돼, 테마를 바꿀 때 페이지 전체는 즉시 바뀌는데
          // 헤더만 300ms 동안 뒤늦게 따라오는 것이 눈에 띈다.
          "public-header fixed inset-x-0 top-0 z-[1000] h-[var(--public-header-height-mobile)] border-b border-transparent bg-(--surface-elevated) transition-[border-color,box-shadow] duration-300 motion-reduce:transition-none md:h-[var(--public-header-height-desktop)]",
        ].join(" ")}
        data-testid="public-header"
      >
        <div className="mx-auto flex h-full w-full max-w-[1200px] items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex min-h-11 items-center gap-[0.6rem]"
              data-testid="public-logo-link"
            >
              <div className="flex h-[1.92rem] items-center justify-center">
                <div
                  className="public-header-logo h-full"
                  role="img"
                  aria-label="연영회 로고"
                  data-testid="public-logo-image"
                />
              </div>
              <div className="text-left text-[0.8rem] leading-[1.2] font-bold tracking-[-0.02em] text-(--text-primary)">
                <span className="block tracking-[-0.05em]">
                  연세대학교 중앙사진동아리
                </span>
                연영회
              </div>
            </Link>
          </div>

          <Suspense fallback={null}>
            <SiteHeaderNav />
          </Suspense>
        </div>
      </header>
    </>
  );
}
