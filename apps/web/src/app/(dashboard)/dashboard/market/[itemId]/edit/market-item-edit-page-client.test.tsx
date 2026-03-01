import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MarketItemEditPageClient from "./market-item-edit-page-client";

const getMarketItemByIdMock = vi.fn();
const updateMarketItemMock = vi.fn();
const uploadFilesWithPresignMock = vi.fn();
const useImageUploadStateMock = vi.fn();
const routerPushMock = vi.fn();
const routerRefreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPushMock,
    refresh: routerRefreshMock,
  }),
}));

vi.mock("../../../../../../lib/admin-api/resources", () => ({
  adminResourceApi: {
    getMarketItemById: (...args: unknown[]) => getMarketItemByIdMock(...args),
    updateMarketItem: (...args: unknown[]) => updateMarketItemMock(...args),
  },
}));

vi.mock("../../../../../../lib/admin-api/upload-batch", () => ({
  uploadFilesWithPresign: (...args: unknown[]) => uploadFilesWithPresignMock(...args),
}));

vi.mock("../../../../../../lib/use-image-upload-state", () => ({
  useImageUploadState: (...args: unknown[]) => useImageUploadStateMock(...args),
}));

vi.mock("../../../../_components/sortable-image-grid", () => ({
  default: () => <div data-testid="sortable-image-grid" />,
}));

vi.mock("../../../../_components/upload-progress-bar", () => ({
  default: () => <div data-testid="upload-progress-bar" />,
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
  imageUrls: ["https://cdn.example.com/market/item-1.jpg"],
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

const createUploadState = (count = 0) => ({
  items: Array.from({ length: count }, (_, index) => ({
    id: `image-${index + 1}`,
    imageUrl: `https://cdn.example.com/market/image-${index + 1}.jpg`,
  })),
  appendExistingUrls: vi.fn(),
  removeItemById: vi.fn(),
  reorderByIds: vi.fn(),
  clear: vi.fn(),
});

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

describe("MarketItemEditPageClient", () => {
  let container: HTMLDivElement;
  let root: Root;
  let uploadState: ReturnType<typeof createUploadState>;

  beforeEach(() => {
    getMarketItemByIdMock.mockReset();
    updateMarketItemMock.mockReset();
    uploadFilesWithPresignMock.mockReset();
    useImageUploadStateMock.mockReset();
    routerPushMock.mockReset();
    routerRefreshMock.mockReset();

    getMarketItemByIdMock.mockResolvedValue(DEFAULT_ITEM);
    updateMarketItemMock.mockResolvedValue(DEFAULT_ITEM);
    uploadFilesWithPresignMock.mockResolvedValue([
      "https://cdn.example.com/market/new-image.jpg",
    ]);
    uploadState = createUploadState(1);
    useImageUploadStateMock.mockImplementation(() => uploadState);

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

  it("본인 글이면 수정 폼을 렌더링하고 초기값을 채운다", async () => {
    await act(async () => {
      root.render(
        <MarketItemEditPageClient viewer={DEFAULT_VIEWER} itemId={DEFAULT_ITEM.id} />,
      );
      await flushEffects();
      await flushEffects();
    });

    expect(getMarketItemByIdMock).toHaveBeenCalledWith(DEFAULT_ITEM.id);
    expect(uploadState.clear).toHaveBeenCalledTimes(1);
    expect(uploadState.appendExistingUrls).toHaveBeenCalledWith(DEFAULT_ITEM.imageUrls);

    const nameInput = container.querySelector(
      "input[placeholder='판매물건 이름']",
    ) as HTMLInputElement | null;
    expect(nameInput?.value).toBe("SONY A7");
  });

  it("수정 저장 시 update API 호출 후 상세 페이지로 이동한다", async () => {
    uploadState = createUploadState(1);
    useImageUploadStateMock.mockImplementation(() => uploadState);

    await act(async () => {
      root.render(
        <MarketItemEditPageClient viewer={DEFAULT_VIEWER} itemId={DEFAULT_ITEM.id} />,
      );
      await flushEffects();
      await flushEffects();
    });

    const nameInput = container.querySelector(
      "input[placeholder='판매물건 이름']",
    ) as HTMLInputElement | null;
    const priceInput = container.querySelector(
      "input[placeholder='가격(원)']",
    ) as HTMLInputElement | null;
    const form = container.querySelector(
      "form[data-testid='market-edit-form']",
    ) as HTMLFormElement | null;

    await act(async () => {
      if (nameInput) {
        setInputValue(nameInput, "SONY A7M4");
      }
      if (priceInput) {
        setInputValue(priceInput, "1300000");
      }
      form?.requestSubmit();
      await flushEffects();
      await flushEffects();
    });

    expect(updateMarketItemMock).toHaveBeenCalledWith(DEFAULT_ITEM.id, {
      name: "SONY A7M4",
      imageUrls: ["https://cdn.example.com/market/image-1.jpg"],
      manufacturer: "Sony",
      productCode: "ILCE-7",
      conditionGrade: "B",
      description: "상태 양호",
      price: 1300000,
    });
    expect(routerPushMock).toHaveBeenCalledWith(`/dashboard/market/${DEFAULT_ITEM.id}`);
    expect(routerRefreshMock).toHaveBeenCalledTimes(1);
  });

  it("본인 글이 아니면 수정 불가 안내를 표시한다", async () => {
    uploadState = createUploadState(1);
    useImageUploadStateMock.mockImplementation(() => uploadState);
    getMarketItemByIdMock.mockResolvedValueOnce({
      ...DEFAULT_ITEM,
      sellerId: "member-2",
    });

    await act(async () => {
      root.render(
        <MarketItemEditPageClient viewer={DEFAULT_VIEWER} itemId={DEFAULT_ITEM.id} />,
      );
      await flushEffects();
      await flushEffects();
    });

    expect(container.textContent).toContain("본인이 작성한 판매글만 수정할 수 있습니다.");
    expect(
      container.querySelector("form[data-testid='market-edit-form']"),
    ).not.toBeInTheDocument();
  });
});
