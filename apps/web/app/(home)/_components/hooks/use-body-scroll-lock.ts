"use client";

import { useEffect } from "react";

/**
 * 오버레이(모바일 메뉴, 사진 라이트박스, 사진가 모달)가 열려 있는 동안 뒤쪽 문서가
 * 스크롤되지 않게 잠근다.
 *
 * 잠그기 직전 값을 기억했다가 그대로 되돌린다. 무조건 `""` 로 지우면 다른 곳이 걸어 둔
 * 잠금까지 풀어 버리고, 잠그지 않은 상태로 마운트될 때도 남의 값을 덮어쓴다.
 */
export const useBodyScrollLock = (isLocked: boolean): void => {
  useEffect(() => {
    if (!isLocked) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isLocked]);
};
