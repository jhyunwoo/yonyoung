import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MarketCreatePageClient from "./market-create-page-client";

const createMarketItemMock = vi.fn();
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

vi.mock("../../../../../lib/admin-api/resources", () => ({
  adminResourceApi: {
    createMarketItem: (...args: unknown[]) => createMarketItemMock(...args),
  },
}));

vi.mock("../../../../../lib/admin-api/upload-batch", () => ({
  uploadFilesWithPresign: (...args: unknown[]) => uploadFilesWithPresignMock(...args),
}));

vi.mock("../../../../../lib/use-image-upload-state", () => ({
  useImageUploadState: (...args: unknown[]) => useImageUploadStateMock(...args),
}));

vi.mock("../../../_components/sortable-image-grid", () => ({
  default: () => <div data-testid="sortable-image-grid" />,
}));

vi.mock("../../../_components/upload-progress-bar", () => ({
  default: () => <div data-testid="upload-progress-bar" />,
}));

Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });

const DEFAULT_VIEWER = {
  id: "member-1",
  displayName: "회원1",
  role: "regular_member",
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

describe("MarketCreatePageClient", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    createMarketItemMock.mockReset();
    uploadFilesWithPresignMock.mockReset();
    useImageUploadStateMock.mockReset();
    routerPushMock.mockReset();
    routerRefreshMock.mockReset();

    createMarketItemMock.mockResolvedValue({
      id: "market-item-1",
    });
    uploadFilesWithPresignMock.mockResolvedValue([
      "https://cdn.example.com/market/new-image.jpg",
    ]);
    useImageUploadStateMock.mockImplementation(() => createUploadState(0));

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

  it("작성 폼은 이미지 필수값을 검증한다", async () => {
    await act(async () => {
      root.render(<MarketCreatePageClient viewer={DEFAULT_VIEWER} />);
      await flushEffects();
      await flushEffects();
    });

    const nameInput = container.querySelector(
      "input[placeholder='판매물건 이름']",
    ) as HTMLInputElement | null;
    const priceInput = container.querySelector(
      "input[placeholder='가격(원)']",
    ) as HTMLInputElement | null;
    const createForm = container.querySelector(
      "form[data-testid='market-create-form']",
    ) as HTMLFormElement | null;

    expect(nameInput).toBeTruthy();
    expect(priceInput).toBeTruthy();
    expect(createForm).toBeTruthy();

    await act(async () => {
      if (nameInput) {
        setInputValue(nameInput, "Sony A7");
      }
      if (priceInput) {
        setInputValue(priceInput, "1200000");
      }
      createForm?.requestSubmit();
      await flushEffects();
    });

    expect(container.textContent).toContain("상품 이미지는 1장 이상, 최대 10장까지 등록");
    expect(createMarketItemMock).not.toHaveBeenCalled();
  });

  it("작성 폼은 이미지 10장 초과 업로드를 차단한다", async () => {
    useImageUploadStateMock.mockImplementation(() => createUploadState(10));

    await act(async () => {
      root.render(<MarketCreatePageClient viewer={DEFAULT_VIEWER} />);
      await flushEffects();
      await flushEffects();
    });

    const imageInput = container.querySelector(
      "input[data-testid='market-image-input']",
    ) as HTMLInputElement | null;
    expect(imageInput).toBeTruthy();
    if (!imageInput) {
      return;
    }

    Object.defineProperty(imageInput, "files", {
      configurable: true,
      value: [new File(["image"], "camera.png", { type: "image/png" })],
    });

    await act(async () => {
      imageInput.dispatchEvent(new Event("change", { bubbles: true }));
      await flushEffects();
    });

    expect(container.textContent).toContain("이미지는 최대 10장까지 등록할 수 있습니다.");
    expect(uploadFilesWithPresignMock).not.toHaveBeenCalled();
  });

  it("작성 성공 시 판매글 생성 후 장터 목록으로 이동한다", async () => {
    useImageUploadStateMock.mockImplementation(() => createUploadState(1));

    await act(async () => {
      root.render(<MarketCreatePageClient viewer={DEFAULT_VIEWER} />);
      await flushEffects();
      await flushEffects();
    });

    const nameInput = container.querySelector(
      "input[placeholder='판매물건 이름']",
    ) as HTMLInputElement | null;
    const priceInput = container.querySelector(
      "input[placeholder='가격(원)']",
    ) as HTMLInputElement | null;
    const createForm = container.querySelector(
      "form[data-testid='market-create-form']",
    ) as HTMLFormElement | null;

    await act(async () => {
      if (nameInput) {
        setInputValue(nameInput, "SONY A7");
      }
      if (priceInput) {
        setInputValue(priceInput, "1200000");
      }
      createForm?.requestSubmit();
      await flushEffects();
      await flushEffects();
    });

    expect(createMarketItemMock).toHaveBeenCalledWith({
      name: "SONY A7",
      imageUrls: ["https://cdn.example.com/market/image-1.jpg"],
      manufacturer: null,
      productCode: null,
      conditionGrade: null,
      description: null,
      price: 1200000,
    });
    expect(routerPushMock).toHaveBeenCalledWith("/dashboard/market");
    expect(routerRefreshMock).toHaveBeenCalledTimes(1);
  });
});
