"use client";

import { useState } from "react";

/**
 * 특정 값이 바뀌면 상태를 되돌린다.
 *
 * effect로 나중에 되돌리면 잘못된 상태(예: 이전 페이지의 열린 메뉴)로 한 프레임이
 * 먼저 그려진다. 렌더 도중 같은 컴포넌트의 상태를 조정하는 것은 React가 공식적으로
 * 지원하는 패턴이고, 커밋 전에 즉시 다시 렌더하므로 깜빡임이 없다.
 *
 * https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
 */
export const useResetOnChange = <T>(value: T, reset: () => void): void => {
  const [previousValue, setPreviousValue] = useState(value);

  if (previousValue !== value) {
    setPreviousValue(value);
    reset();
  }
};
