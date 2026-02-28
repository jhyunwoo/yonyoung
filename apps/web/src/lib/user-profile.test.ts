import { describe, expect, it } from "vitest";
import { buildDashboardViewerProfile } from "./user-profile";

describe("buildDashboardViewerProfile", () => {
  it("familyName/givenName이 없을 때 fallback 이름의 공백을 제거한다", () => {
    const viewer = buildDashboardViewerProfile(
      {
        id: "user-1",
        email: "user-1@example.com",
        name: "홍 길 동",
        role: "regular_member",
      },
      null,
    );

    expect(viewer.displayName).toBe("홍길동");
  });

  it("fallback 이름도 없으면 이메일 local-part를 사용한다", () => {
    const viewer = buildDashboardViewerProfile(
      {
        id: "user-2",
        email: "viewer.test@example.com",
        name: "   ",
        role: "regular_member",
      },
      null,
    );

    expect(viewer.displayName).toBe("viewer.test");
  });
});
