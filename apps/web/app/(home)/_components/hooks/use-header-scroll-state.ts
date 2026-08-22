"use client";

import { useEffect, useState } from "react";

const SCROLLED_THRESHOLD_PX = 50;

/** 헤더가 "스크롤된 상태"인지. 테두리와 그림자를 붙일지 결정한다. */
export const useHeaderScrollState = (): boolean => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > SCROLLED_THRESHOLD_PX);
    window.addEventListener("scroll", onScroll);
    // 새로고침으로 이미 스크롤된 위치에서 시작할 수 있으므로 한 번 즉시 확인한다.
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return isScrolled;
};
