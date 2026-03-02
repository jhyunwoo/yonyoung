import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LinktreeCreateForm from "./linktree-create-form";

const routerReplaceMock = vi.fn();
const routerRefreshMock = vi.fn();

const createLinktreeMock = vi.fn();
const addLinktreeItemMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: routerReplaceMock,
    refresh: routerRefreshMock,
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("../../../lib/admin-api/resources", () => ({
  adminResourceApi: {
    createLinktree: (...args: unknown[]) => createLinktreeMock(...args),
    addLinktreeItem: (...args: unknown[]) => addLinktreeItemMock(...args),
  },
}));

Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });

const flushEffects = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

const setInputValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;

  if (setter) {
    setter.call(input, value);
  } else {
    input.value = value;
  }

  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
};

describe("LinktreeCreateForm", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    routerReplaceMock.mockReset();
    routerRefreshMock.mockReset();
    createLinktreeMock.mockReset();
    addLinktreeItemMock.mockReset();

    createLinktreeMock.mockResolvedValue({
      id: "linktree-1",
      name: "공식 채널",
      createdAt: Date.UTC(2026, 0, 1),
      updatedAt: Date.UTC(2026, 0, 1),
      updatedBy: null,
      items: [],
    });
    addLinktreeItemMock.mockResolvedValue({
      id: "item-1",
      linktreeId: "linktree-1",
      name: "인스타그램",
      link: "https://instagram.com/yonyoung",
      createdAt: Date.UTC(2026, 0, 1),
      updatedAt: Date.UTC(2026, 0, 1),
      updatedBy: null,
    });

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

  it("분류 이름이 비어 있으면 생성을 막는다", async () => {
    await act(async () => {
      root.render(<LinktreeCreateForm canWrite listPath="/dashboard/settings/linktree" />);
      await flushEffects();
    });

    const createForm = container.querySelector(
      "form[data-testid='linktree-create-form']",
    ) as HTMLFormElement | null;
    expect(createForm).toBeTruthy();

    await act(async () => {
      createForm?.requestSubmit();
      await flushEffects();
    });

    expect(container.textContent).toContain("분류 이름을 입력해 주세요.");
    expect(createLinktreeMock).not.toHaveBeenCalled();
  });

  it("유효한 입력이면 링크 모음과 하위 링크를 순서대로 생성한다", async () => {
    await act(async () => {
      root.render(<LinktreeCreateForm canWrite listPath="/dashboard/settings/linktree" />);
      await flushEffects();
    });

    const groupNameInput = container.querySelector(
      "input[data-testid='linktree-group-name-input']",
    ) as HTMLInputElement | null;
    const firstItemNameInput = container.querySelector(
      "input[data-testid='linktree-item-name-input-0']",
    ) as HTMLInputElement | null;
    const firstItemLinkInput = container.querySelector(
      "input[data-testid='linktree-item-link-input-0']",
    ) as HTMLInputElement | null;
    const addItemButton = container.querySelector(
      "button[data-testid='linktree-item-add-button']",
    ) as HTMLButtonElement | null;

    expect(groupNameInput).toBeTruthy();
    expect(firstItemNameInput).toBeTruthy();
    expect(firstItemLinkInput).toBeTruthy();
    expect(addItemButton).toBeTruthy();

    await act(async () => {
      if (groupNameInput) {
        setInputValue(groupNameInput, "  공식 채널  ");
      }
      if (firstItemNameInput) {
        setInputValue(firstItemNameInput, "  인스타그램  ");
      }
      if (firstItemLinkInput) {
        setInputValue(firstItemLinkInput, " https://instagram.com/yonyoung ");
      }
      addItemButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushEffects();
    });

    const secondItemNameInput = container.querySelector(
      "input[data-testid='linktree-item-name-input-1']",
    ) as HTMLInputElement | null;
    const secondItemLinkInput = container.querySelector(
      "input[data-testid='linktree-item-link-input-1']",
    ) as HTMLInputElement | null;

    await act(async () => {
      if (secondItemNameInput) {
        setInputValue(secondItemNameInput, "유튜브");
      }
      if (secondItemLinkInput) {
        setInputValue(secondItemLinkInput, "https://youtube.com/@yonyoung");
      }
      await flushEffects();
    });

    const createForm = container.querySelector(
      "form[data-testid='linktree-create-form']",
    ) as HTMLFormElement | null;

    await act(async () => {
      createForm?.requestSubmit();
      await flushEffects();
      await flushEffects();
    });

    expect(createLinktreeMock).toHaveBeenCalledWith({ name: "공식 채널" });
    expect(addLinktreeItemMock).toHaveBeenCalledTimes(2);
    expect(addLinktreeItemMock).toHaveBeenNthCalledWith(1, "linktree-1", {
      name: "인스타그램",
      link: "https://instagram.com/yonyoung",
    });
    expect(addLinktreeItemMock).toHaveBeenNthCalledWith(2, "linktree-1", {
      name: "유튜브",
      link: "https://youtube.com/@yonyoung",
    });
    expect(routerReplaceMock).toHaveBeenCalledWith("/dashboard/settings/linktree/linktree-1");
    expect(routerRefreshMock).toHaveBeenCalledTimes(1);
  });
});
