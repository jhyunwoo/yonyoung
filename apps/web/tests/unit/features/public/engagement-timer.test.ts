import { describe, expect, it } from "vitest";
import { createEngagementTimer } from "@/features/public/analytics/engagement-timer";

describe("createEngagementTimer", () => {
  it("보이는 동안의 시간만 더한다", () => {
    const timer = createEngagementTimer(0, true);
    timer.pause(1_000);
    timer.resume(5_000);
    expect(timer.total(7_000)).toBe(3_000);
  });

  it("숨겨진 상태로 시작하면 resume 전까지 0이다", () => {
    const timer = createEngagementTimer(0, false);
    expect(timer.total(10_000)).toBe(0);
    timer.resume(10_000);
    expect(timer.total(12_000)).toBe(2_000);
  });

  it("pause·resume을 거듭 불러도 중복으로 세지 않는다", () => {
    const timer = createEngagementTimer(0, true);
    timer.pause(1_000);
    timer.pause(2_000);
    timer.resume(3_000);
    timer.resume(4_000);
    expect(timer.total(5_000)).toBe(3_000);
  });
});
