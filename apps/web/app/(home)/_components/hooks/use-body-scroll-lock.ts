"use client";

import { useEffect } from "react";

/** 모바일 메뉴가 열려 있는 동안 뒤쪽 문서가 스크롤되지 않게 잠근다. */
export const useBodyScrollLock = (isLocked: boolean): void => {
  useEffect(() => {
    document.body.style.overflow = isLocked ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isLocked]);
};
