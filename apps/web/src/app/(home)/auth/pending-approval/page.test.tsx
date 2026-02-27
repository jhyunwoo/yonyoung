import React from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireSessionMock,
  getCurrentUserProfileMock,
  redirectMock,
} = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  getCurrentUserProfileMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("../../../../lib/auth-server-tool", () => ({
  serverAuthTool: {
    requireSession: requireSessionMock,
    getCurrentUserProfile: getCurrentUserProfileMock,
  },
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

Object.assign(globalThis, { React });

describe("PendingApprovalPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("헤더 높이를 고려한 상단 오프셋과 최소 높이 레이아웃을 사용한다", async () => {
    const session = {
      session: {
        id: "session-id",
        userId: "user-id",
        token: "token",
        expiresAt: Date.now() + 1000 * 60 * 60,
      },
      user: {
        id: "user-id",
        email: "unverified@example.com",
        name: "unverified",
        role: "unverified",
        familyName: "홍",
        givenName: "길동",
        college: "문과대학",
        department: "국어국문학과",
        studentNumber: "2020123456",
        phoneNumber: "010-1234-5678",
      },
    };

    requireSessionMock.mockResolvedValue(session);
    getCurrentUserProfileMock.mockResolvedValue(session.user);

    const { default: PendingApprovalPage } = await import("./page");
    const result = await PendingApprovalPage();

    expect(redirectMock).not.toHaveBeenCalled();
    expect(result?.props.className).toContain("min-h-screen");
    expect(result?.props.className).toContain("pt-[72px]");
    expect(result?.props.className).toContain("md:pt-[80px]");
  });
});
