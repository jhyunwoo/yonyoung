"use client";

import { useState } from "react";

const koreanYearFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  timeZone: "Asia/Seoul",
});

/**
 * 푸터 저작권 연도.
 *
 * 연도는 마운트 시점에 한 번만 읽는다. 렌더할 때마다 `Date.now()`를 부르면
 * 리렌더마다 값이 달라질 수 있는 비순수 렌더가 되고, 해가 바뀌는 순간에만
 * 의미가 있는 차이라 그럴 이유가 없다.
 */
export default function CurrentYear() {
  const [year] = useState(() => koreanYearFormatter.format(Date.now()));

  return <>{year}</>;
}
