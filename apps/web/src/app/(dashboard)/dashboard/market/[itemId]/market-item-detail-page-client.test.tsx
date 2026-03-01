import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MarketItemDetailPageClient from "./market-item-detail-page-client";

const getMarketItemByIdMock = vi.fn();
const updateMarketItemStatusMock = vi.fn();
const listMarketCommentsByItemIdMock = vi.fn();
const createMarketCommentMock = vi.fn();
const upsertMarketPushSubscriptionMock = vi.fn();
const deleteMarketPushSubscriptionMock = vi.fn();

vi.mock("../../../../../lib/admin-api/resources", () => ({
  adminResourceApi: {
    getMarketItemById: (...args: unknown[]) => getMarketItemByIdMock(...args),
    updateMarketItemStatus: (...args: unknown[]) => updateMarketItemStatusMock(...args),
    listMarketCommentsByItemId: (...args: unknown[]) => listMarketCommentsByItemIdMock(...args),
    createMarketComment: (...args: unknown[]) => createMarketCommentMock(...args),
    upsertMarketPushSubscription: (...args: unknown[]) =>
      upsertMarketPushSubscriptionMock(...args),
    deleteMarketPushSubscription: (...args: unknown[]) =>
      deleteMarketPushSubscriptionMock(...args),
  },
}));

Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });

const DEFAULT_VIEWER = {
  id: "member-1",
  displayName: "회원1",
  role: "regular_member",
};

const DEFAULT_ITEM = {
  id: "market-item-1",
  sellerId: "member-1",
  name: "SONY A7",
  imageUrls: [
    "https://cdn.example.com/market/item-1-cover.jpg",
    "https://cdn.example.com/market/item-1-detail-1.jpg",
    "https://cdn.example.com/market/item-1-detail-2.jpg",
  ],
  manufacturer: "Sony",
  productCode: "ILCE-7",
  conditionGrade: "B" as const,
  description: "상태 양호",
  price: 1200000,
  status: "selling" as const,
  seller: {
    id: "member-1",
    name: "판매자",
    image: null,
    role: "regular_member" as const,
  },
  createdAt: Date.UTC(2026, 0, 1),
  updatedAt: Date.UTC(2026, 0, 1),
  updatedBy: null,
};

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

describe("MarketItemDetailPageClient", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    getMarketItemByIdMock.mockReset();
    updateMarketItemStatusMock.mockReset();
    listMarketCommentsByItemIdMock.mockReset();
    createMarketCommentMock.mockReset();
    upsertMarketPushSubscriptionMock.mockReset();
    deleteMarketPushSubscriptionMock.mockReset();

    getMarketItemByIdMock.mockResolvedValue(DEFAULT_ITEM);
    updateMarketItemStatusMock.mockResolvedValue({
      ...DEFAULT_ITEM,
      status: "reserved",
    });
    listMarketCommentsByItemIdMock.mockResolvedValue([]);
    createMarketCommentMock.mockResolvedValue({
      id: "comment-1",
      itemId: DEFAULT_ITEM.id,
      author: DEFAULT_ITEM.seller,
      content: "댓글 내용",
      createdAt: Date.UTC(2026, 0, 1),
      updatedAt: Date.UTC(2026, 0, 1),
      updatedBy: null,
    });
    upsertMarketPushSubscriptionMock.mockResolvedValue(undefined);
    deleteMarketPushSubscriptionMock.mockResolvedValue(undefined);

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("다중 이미지와 상품 상세 정보를 렌더링한다", async () => {
    await act(async () => {
      root.render(<MarketItemDetailPageClient viewer={DEFAULT_VIEWER} itemId={DEFAULT_ITEM.id} />);
      await flushEffects();
      await flushEffects();
    });

    expect(getMarketItemByIdMock).toHaveBeenCalledWith(DEFAULT_ITEM.id);
    expect(container.textContent).toContain("SONY A7");
    expect(container.textContent).toContain("제조사");
    expect(container.textContent).toContain("제품 코드");
    expect(container.textContent).toContain("제품 상태 등급");

    const images = container.querySelectorAll("img");
    expect(images.length).toBeGreaterThanOrEqual(4);
  });

  it("썸네일 선택으로 현재 이미지를 전환한다", async () => {
    await act(async () => {
      root.render(<MarketItemDetailPageClient viewer={DEFAULT_VIEWER} itemId={DEFAULT_ITEM.id} />);
      await flushEffects();
      await flushEffects();
    });

    const firstThumbnail = container.querySelector(
      "button[data-testid='market-thumbnail-0']",
    ) as HTMLButtonElement | null;
    const secondThumbnail = container.querySelector(
      "button[data-testid='market-thumbnail-1']",
    ) as HTMLButtonElement | null;

    expect(firstThumbnail?.getAttribute("aria-pressed")).toBe("true");
    expect(secondThumbnail?.getAttribute("aria-pressed")).toBe("false");

    await act(async () => {
      secondThumbnail?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushEffects();
    });

    expect(secondThumbnail?.getAttribute("aria-pressed")).toBe("true");
  });

  it("좌우 버튼으로 이미지를 순환 이동한다", async () => {
    await act(async () => {
      root.render(<MarketItemDetailPageClient viewer={DEFAULT_VIEWER} itemId={DEFAULT_ITEM.id} />);
      await flushEffects();
      await flushEffects();
    });

    const nextButton = container.querySelector(
      "button[data-testid='market-image-next']",
    ) as HTMLButtonElement | null;

    await act(async () => {
      nextButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushEffects();
    });

    const secondThumbnail = container.querySelector(
      "button[data-testid='market-thumbnail-1']",
    ) as HTMLButtonElement | null;
    expect(secondThumbnail?.getAttribute("aria-pressed")).toBe("true");
  });

  it("현재 이미지를 클릭하면 확대 모달이 열린다", async () => {
    await act(async () => {
      root.render(<MarketItemDetailPageClient viewer={DEFAULT_VIEWER} itemId={DEFAULT_ITEM.id} />);
      await flushEffects();
      await flushEffects();
    });

    const mainImageButton = container.querySelector(
      "button[data-testid='market-main-image-button']",
    ) as HTMLButtonElement | null;

    await act(async () => {
      mainImageButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushEffects();
    });

    expect(container.querySelector("[data-testid='market-image-modal']")).toBeInTheDocument();
  });

  it("모달 배경을 클릭하면 확대 모달이 닫힌다", async () => {
    await act(async () => {
      root.render(<MarketItemDetailPageClient viewer={DEFAULT_VIEWER} itemId={DEFAULT_ITEM.id} />);
      await flushEffects();
      await flushEffects();
    });

    const mainImageButton = container.querySelector(
      "button[data-testid='market-main-image-button']",
    ) as HTMLButtonElement | null;

    await act(async () => {
      mainImageButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushEffects();
    });

    const modalBackdrop = container.querySelector(
      "[data-testid='market-image-modal']",
    ) as HTMLDivElement | null;
    expect(modalBackdrop).toBeInTheDocument();

    await act(async () => {
      modalBackdrop?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushEffects();
    });

    expect(container.querySelector("[data-testid='market-image-modal']")).not.toBeInTheDocument();
  });

  it("본인이 작성한 글이면 수정 링크가 표시된다", async () => {
    await act(async () => {
      root.render(<MarketItemDetailPageClient viewer={DEFAULT_VIEWER} itemId={DEFAULT_ITEM.id} />);
      await flushEffects();
      await flushEffects();
    });

    const editLink = container.querySelector(
      "a[data-testid='market-edit-link']",
    ) as HTMLAnchorElement | null;

    expect(editLink).toBeInTheDocument();
    expect(editLink?.getAttribute("href")).toBe(`/dashboard/market/${DEFAULT_ITEM.id}/edit`);
  });

  it("본인이 작성하지 않은 글이면 수정 링크가 숨겨진다", async () => {
    getMarketItemByIdMock.mockResolvedValueOnce({
      ...DEFAULT_ITEM,
      sellerId: "member-2",
    });

    await act(async () => {
      root.render(
        <MarketItemDetailPageClient
          viewer={DEFAULT_VIEWER}
          itemId={DEFAULT_ITEM.id}
        />,
      );
      await flushEffects();
      await flushEffects();
    });

    expect(
      container.querySelector("a[data-testid='market-edit-link']"),
    ).not.toBeInTheDocument();
  });

  it("댓글 작성 후 목록에 즉시 반영된다", async () => {
    createMarketCommentMock.mockResolvedValueOnce({
      id: "comment-next",
      itemId: DEFAULT_ITEM.id,
      author: DEFAULT_ITEM.seller,
      content: "좋은 거래 원합니다",
      createdAt: Date.UTC(2026, 0, 1),
      updatedAt: Date.UTC(2026, 0, 1),
      updatedBy: null,
    });

    await act(async () => {
      root.render(<MarketItemDetailPageClient viewer={DEFAULT_VIEWER} itemId={DEFAULT_ITEM.id} />);
      await flushEffects();
      await flushEffects();
    });

    const commentInput = container.querySelector(
      "input[placeholder='댓글 작성']",
    ) as HTMLInputElement | null;
    const commentButton = container.querySelector(
      "button[data-testid='market-comment-submit']",
    ) as HTMLButtonElement | null;

    await act(async () => {
      if (commentInput) {
        setInputValue(commentInput, "좋은 거래 원합니다");
      }
      commentButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushEffects();
      await flushEffects();
    });

    expect(createMarketCommentMock).toHaveBeenCalledWith(DEFAULT_ITEM.id, {
      content: "좋은 거래 원합니다",
    });
    expect(container.textContent).toContain("좋은 거래 원합니다");
  });

  it("알림 등록 버튼은 권한 요청 후 구독을 저장한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "AQAB");

    const requestPermissionMock = vi.fn(async () => "granted" as NotificationPermission);
    const subscription = {
      endpoint: "https://push.example.com/subscription",
      toJSON: () => ({
        endpoint: "https://push.example.com/subscription",
        keys: {
          p256dh: "p256-key",
          auth: "auth-key",
        },
      }),
      getKey: vi.fn(() => null),
      unsubscribe: vi.fn(async () => true),
    } as unknown as PushSubscription;

    const getSubscriptionMock = vi.fn(async () => null as PushSubscription | null);
    const subscribeMock = vi.fn(async () => subscription);
    const registerMock = vi.fn(async () => ({
      pushManager: {
        getSubscription: getSubscriptionMock,
        subscribe: subscribeMock,
      },
    }));

    Object.defineProperty(globalThis, "Notification", {
      configurable: true,
      value: {
        requestPermission: requestPermissionMock,
      } satisfies Pick<typeof Notification, "requestPermission">,
    });
    Object.defineProperty(window, "PushManager", {
      configurable: true,
      value: class MockPushManager {},
    });
    Object.defineProperty(globalThis.navigator, "serviceWorker", {
      configurable: true,
      value: {
        register: registerMock,
      },
    });

    await act(async () => {
      root.render(<MarketItemDetailPageClient viewer={DEFAULT_VIEWER} itemId={DEFAULT_ITEM.id} />);
      await flushEffects();
      await flushEffects();
    });

    const registerButton = container.querySelector(
      "button[data-testid='market-push-register']",
    ) as HTMLButtonElement | null;

    await act(async () => {
      registerButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushEffects();
      await flushEffects();
    });

    expect(requestPermissionMock).toHaveBeenCalledTimes(1);
    expect(subscribeMock).toHaveBeenCalledTimes(1);
    expect(upsertMarketPushSubscriptionMock).toHaveBeenCalledWith({
      endpoint: "https://push.example.com/subscription",
      p256dh: "p256-key",
      auth: "auth-key",
    });
    expect(container.textContent).toContain("댓글 알림이 활성화되었습니다.");
  });
});
