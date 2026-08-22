"use client";

import { useEffect, useState } from "react";

/**
 * 클라이언트에서 hydration이 끝났는지 알려 준다.
 *
 * 포털 마운트나 터치/포인터 전용 동작처럼 서버 렌더 결과에는 존재할 수 없는 것을
 * 켜는 데 쓴다. 서버와 첫 클라이언트 렌더가 모두 false라 hydration 불일치가 없다.
 *
 * 이 상태를 만들 수 있는 방법은 마운트 effect뿐이다 — "렌더가 커밋됐다"는 사실
 * 자체가 신호라서 렌더 단계에서는 계산할 수 없다.
 */
export const useIsMounted = (): boolean => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 완료를 알리는 유일한 수단이다.
    setIsMounted(true);
  }, []);

  return isMounted;
};
