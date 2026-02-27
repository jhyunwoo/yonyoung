import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AuthProfileForm from "./profile-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });

describe("AuthProfileForm", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("기본 정보 입력(auth) 모드에서 대학/학과 placeholder를 노출한다", async () => {
    await act(async () => {
      root.render(
        <AuthProfileForm
          userId="user-1"
          role="unverified"
          mode="auth"
          initialProfile={{
            image: "",
            familyName: "",
            givenName: "",
            college: "",
            department: "",
            studentNumber: "",
            phoneNumber: "",
          }}
        />,
      );
    });

    expect(
      container.querySelector("input[placeholder='인공지능융합대학']"),
    ).toBeInTheDocument();
    expect(
      container.querySelector("input[placeholder='컴퓨터과학과']"),
    ).toBeInTheDocument();
  });
});
