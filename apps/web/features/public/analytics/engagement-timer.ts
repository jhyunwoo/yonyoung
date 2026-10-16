/** 탭이 보이는 동안의 시간만 누적한다. 시각은 performance.now() 같은 단조 증가 값을 넘긴다. */
export const createEngagementTimer = (nowMs: number, visible: boolean) => {
  let accumulated = 0;
  let visibleSince: number | null = visible ? nowMs : null;

  return {
    pause(now: number) {
      if (visibleSince === null) return;
      accumulated += now - visibleSince;
      visibleSince = null;
    },
    resume(now: number) {
      if (visibleSince === null) visibleSince = now;
    },
    total(now: number): number {
      return accumulated + (visibleSince === null ? 0 : now - visibleSince);
    },
  };
};
