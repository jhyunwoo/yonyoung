import { describe, expect, it } from "vitest";

import {
  buildMemberDisplayInitial,
  buildMemberDisplayName,
  compactDisplayName,
  formatKoreanName,
} from "@/features/dashboard/members/display-name";
import {
  buildMemberRoleLabel,
  canEditMemberProfile,
  isExecutiveRole,
} from "@/features/dashboard/members/member-role-label";
import {
  buildDashboardViewerProfile,
  toEditableUserProfile,
} from "@/features/dashboard/members/user-profile";

describe("features/dashboard/members", () => {
  it("builds display names and initials", () => {
    expect(compactDisplayName("  김 연 영  ")).toBe("김연영");
    expect(compactDisplayName(undefined)).toBeNull();

    expect(formatKoreanName({ familyName: "김", givenName: "연영" })).toBe("김연영");
    expect(formatKoreanName({ email: "hello@example.com" })).toBe("hello");

    expect(buildMemberDisplayName({ familyName: "김", givenName: "연영" })).toBe("김연영");
    expect(buildMemberDisplayName({ name: "  Legacy Name " })).toBe("LegacyName");
    expect(buildMemberDisplayName({ email: "member@example.com" })).toBe("member");
    expect(buildMemberDisplayName({})).toBe("이름 미등록");

    expect(buildMemberDisplayInitial("홍길동")).toBe("홍");
    expect(buildMemberDisplayInitial(" ")).toBe("?");
  });

  it("resolves member role labels and permissions", () => {
    expect(buildMemberRoleLabel("president")).toBe("회장");
    expect(buildMemberRoleLabel("regular_member")).toBe("정회원");
    expect(buildMemberRoleLabel(null)).toBe("역할 미지정");

    expect(isExecutiveRole("manager")).toBe(true);
    expect(isExecutiveRole("regular_member")).toBe(false);

    expect(canEditMemberProfile("president")).toBe(true);
    expect(canEditMemberProfile("manager")).toBe(false);
  });

  it("normalizes editable profile and viewer profile", () => {
    expect(
      toEditableUserProfile({
        image: "https://img",
        showcaseImageUrls: ["a", 1, "b"],
        familyName: "김",
        givenName: "연영",
        college: "공대",
        department: "컴공",
        studentNumber: "2023000001",
        phoneNumber: "010-1234-5678",
        collaborationAvailable: true,
        personalLink: "https://instagram.com/x",
      }),
    ).toEqual({
      image: "https://img",
      showcaseImageUrls: ["a", "b"],
      familyName: "김",
      givenName: "연영",
      college: "공대",
      department: "컴공",
      studentNumber: "2023000001",
      phoneNumber: "010-1234-5678",
      collaborationAvailable: true,
      personalLink: "https://instagram.com/x",
    });

    const viewer = buildDashboardViewerProfile(
      {
        id: "u1",
        email: "viewer@example.com",
        name: " 뷰어 ",
        role: "regular_member",
        familyName: "",
        givenName: "",
      },
      {
        familyName: "김",
        givenName: "연영",
        image: "https://img/user.jpg",
      },
    );

    expect(viewer).toEqual({
      id: "u1",
      email: "viewer@example.com",
      image: "https://img/user.jpg",
      role: "regular_member",
      displayName: "김연영",
    });

    const fallbackViewer = buildDashboardViewerProfile(
      {
        id: "u2",
        email: "fallback@example.com",
        name: " Legacy User ",
        role: null,
      },
      null,
    );

    expect(fallbackViewer.displayName).toBe("LegacyUser");
  });
});
