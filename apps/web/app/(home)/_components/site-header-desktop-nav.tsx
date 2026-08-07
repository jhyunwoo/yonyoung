"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { isActivePath, navItems, type NavItem } from "./site-nav-items";

const desktopLinkBaseClass =
  "relative block py-6 text-[0.9rem] font-medium tracking-[0.05em] text-(--text-primary) uppercase after:absolute after:bottom-[0.8rem] after:left-0 after:h-[2px] after:w-0 after:bg-(--text-primary) after:transition-[width] after:duration-300 hover:after:w-full";

/*
  CSS 로 여는 경로(parent-hovered / group-focus-within)를 남겨 둔 것은 의도한
  것이다. 하이드레이션 전에도, JS 가 꺼져 있어도 마우스·키보드로는 하위 메뉴에
  닿을 수 있어야 한다. 아래 컴포넌트의 상태는 이 CSS 조건과 정확히 같은 순간에
  켜지도록 맞춰져 있고, data-open 은 거기에 터치 경로를 더한 것이다.

  parent-hovered 가 group-hover 가 아닌 이유: Tailwind 의 group-hover 는
  @media (hover: hover) 로 감싸여 나가는데, 터치스크린을 겸한 데스크톱은
  hover: none 을 보고해서 :hover 가 걸려도 규칙이 무시된다. globals.css 참고.

  visibility 를 transition 목록에 반드시 남겨야 한다. 빠질 경우 닫힐 때 즉시
  hidden 이 돼 페이드아웃이 통째로 사라진다.
*/
const submenuClass =
  "invisible absolute top-full left-1/2 z-20 min-w-[150px] origin-top -translate-x-1/2 scale-[0.97] border-t-2 border-(--surface-strong-border) bg-(--surface-elevated) py-2 opacity-0 shadow-[0_4px_15px_var(--shadow-strong)] transition-[opacity,scale,visibility] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] parent-hovered:visible parent-hovered:scale-100 parent-hovered:opacity-100 group-focus-within:visible group-focus-within:scale-100 group-focus-within:opacity-100 data-[open=true]:visible data-[open=true]:scale-100 data-[open=true]:opacity-100 motion-reduce:transition-none motion-reduce:scale-100";

type DesktopNavItemProps = {
  item: NavItem;
  active: boolean;
  /** 터치 탭으로 열린 상태. 항목끼리 배타적이어야 해서 부모가 들고 있다. */
  isTapOpen: boolean;
  onTapOpen: () => void;
  onSubmenuNavigate: () => void;
};

/**
 * 하위 메뉴를 여는 경로가 세 개이고, 셋 다 동시에 성립할 수 있다.
 * aria-expanded 가 정확하려면 세 경로를 전부 항목 단위로 알고 있어야 한다.
 *
 * 1. 마우스 hover — isPointerInside
 * 2. 키보드 focus — isFocusInside
 * 3. 터치 탭      — isTapOpen (부모 소유)
 *
 * hover 와 focus 를 항목 단위로 두는 이유: 포커스는 ARCHIVE 에 있고 마우스는
 * ABOUT 위에 있는 상황이 가능해서, 실제로 두 메뉴가 동시에 열린다. "지금 열린
 * 항목" 하나로는 이 상태를 표현할 수 없다.
 */
function DesktopNavItem({
  item,
  active,
  isTapOpen,
  onTapOpen,
  onSubmenuNavigate,
}: DesktopNavItemProps) {
  const [isPointerInside, setIsPointerInside] = useState(false);
  const [isFocusInside, setIsFocusInside] = useState(false);

  const linkClassName = `${desktopLinkBaseClass} ${active ? "after:w-full" : ""}`.trim();

  if (!item.children) {
    return (
      <li className="relative">
        <Link
          href={item.href}
          prefetch={item.prefetch}
          rel={item.rel}
          className={linkClassName}
          data-testid={`public-nav-desktop-${item.testId}`}
        >
          {item.label}
        </Link>
      </li>
    );
  }

  const isOpen = isTapOpen || isPointerInside || isFocusInside;
  const submenuId = `public-nav-desktop-${item.testId}-submenu`;

  return (
    <li
      className="relative group"
      onPointerEnter={(event) => {
        // 터치·펜은 hover 개념이 없다. 그런데도 탭할 때 pointerenter 가 오고
        // 손을 떼면 pointerleave 가 뒤따라서, 걸러내지 않으면 방금 탭으로 연
        // 메뉴를 곧바로 닫아 버린다.
        if (event.pointerType !== "mouse") {
          return;
        }
        setIsPointerInside(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "mouse") {
          return;
        }
        setIsPointerInside(false);
      }}
      // React 의 onFocus/onBlur 는 focusin/focusout 처럼 버블링한다.
      onFocus={() => setIsFocusInside(true)}
      onBlur={(event) => {
        // 하위 메뉴 안쪽으로 포커스가 옮겨 가는 중이면 닫으면 안 된다.
        if (
          event.relatedTarget instanceof Node &&
          event.currentTarget.contains(event.relatedTarget)
        ) {
          return;
        }
        setIsFocusInside(false);
      }}
    >
      <Link
        href={item.href}
        prefetch={item.prefetch}
        rel={item.rel}
        className={linkClassName}
        data-testid={`public-nav-desktop-${item.testId}`}
        aria-expanded={isOpen}
        aria-controls={submenuId}
        onClick={(event) => {
          // 최신 브라우저에서 click 은 PointerEvent 다. 마우스는 "mouse",
          // 키보드 활성화는 "" 이므로 둘 다 지금까지처럼 그냥 이동한다.
          // PointerEvent 를 안 주는 브라우저는 undefined 라 역시 이동한다.
          const { pointerType } = event.nativeEvent as PointerEvent;
          if (pointerType !== "touch" && pointerType !== "pen") {
            return;
          }

          // 터치는 탭을 "열기"로 쓴다. 부모 href 는 첫 번째 자식과 같은 곳을
          // 가리키므로(ARCHIVE = 활동 기록) 이동을 막아도 잃는 링크가 없다.
          //
          // 토글이 아니라 열기 전용인 것은 의도한 것이다. 터치 브라우저는 탭한
          // 요소에 :hover 를 남기기 때문에(sticky hover), 두 번째 탭으로 상태만
          // 닫으면 CSS hover 규칙이 계속 열어 둬서 화면과 어긋난다. 닫기는
          // 바깥 탭 / Esc 가 담당한다 — 둘 다 sticky hover 도 같이 걷어낸다.
          event.preventDefault();
          onTapOpen();
        }}
      >
        {item.label}
      </Link>
      <ul
        id={submenuId}
        className={submenuClass}
        data-open={isOpen}
        data-testid={submenuId}
      >
        {item.children.map((child) => (
          <li key={child.href} className="w-full">
            <Link
              href={child.href}
              className="block whitespace-nowrap px-6 py-[0.8rem] text-[0.85rem] text-(--text-primary) transition-colors duration-200 hover:bg-(--surface-muted)"
              // 같은 경로를 다시 고르면 pathname 이 안 바뀌어 부모의 effect 가
              // 안 돈다. 그래서 여기서도 명시적으로 닫는다.
              onClick={onSubmenuNavigate}
            >
              {child.label}
            </Link>
          </li>
        ))}
      </ul>
    </li>
  );
}

/**
 * 데스크톱 내비게이션. 768px 미만은 햄버거 메뉴가 따로 있지만, 아이패드 가로처럼
 * 큰 터치 화면은 이 데스크톱 내비를 받기 때문에 터치로 여는 경로가 없으면
 * 하위 메뉴가 완전히 막힌다.
 */
export default function SiteHeaderDesktopNav({ pathname }: { pathname: string }) {
  const [tapOpenHref, setTapOpenHref] = useState<string | null>(null);
  const navRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setTapOpenHref(null);
  }, [pathname]);

  useEffect(() => {
    if (!tapOpenHref) {
      return;
    }

    // pointerdown 으로 잡아야 링크 탭이 완료되기 전에 닫힌다. 여는 탭 자체는
    // tapOpenHref 가 아직 null 이라 이 리스너가 붙기 전에 지나간다.
    const onPointerDown = (event: PointerEvent) => {
      if (navRef.current?.contains(event.target as Node)) {
        return;
      }
      setTapOpenHref(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setTapOpenHref(null);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [tapOpenHref]);

  return (
    <ul ref={navRef} className="flex list-none items-center gap-8">
      {navItems.map((item) => (
        <DesktopNavItem
          key={item.href}
          item={item}
          active={isActivePath(pathname, item)}
          isTapOpen={tapOpenHref === item.href}
          onTapOpen={() => setTapOpenHref(item.href)}
          onSubmenuNavigate={() => setTapOpenHref(null)}
        />
      ))}
    </ul>
  );
}
