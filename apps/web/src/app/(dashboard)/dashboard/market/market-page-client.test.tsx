import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MarketPageClient from "./market-page-client";

const listMarketItemsMock = vi.fn();

vi.mock("../../../../lib/admin-api/resources", () => ({
  adminResourceApi: {
    listMarketItems: (...args: unknown[]) => listMarketItemsMock(...args),
  },
}));

Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });

const DEFAULT_VIEWER = {
  id: "member-1",
  displayName: "회원1",
  role: "regular_member",
};

const MARKET_ITEMS = [
  {
    id: "market-item-selling",
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
      name: "판매자1",
      image: null,
      role: "regular_member" as const,
    },
    createdAt: Date.UTC(2026, 0, 1),
    updatedAt: Date.UTC(2026, 0, 1),
    updatedBy: null,
  },
  {
    id: "market-item-reserved",
    sellerId: "member-2",
    name: "Canon RF 24-70",
    imageUrls: ["https://cdn.example.com/market/item-2.jpg"],
    manufacturer: "Canon",
    productCode: "RF24-70",
    conditionGrade: "A" as const,
    description: null,
    price: 2100000,
    status: "reserved" as const,
    seller: {
      id: "member-2",
      name: "판매자2",
      image: null,
      role: "regular_member" as const,
    },
    createdAt: Date.UTC(2026, 0, 2),
    updatedAt: Date.UTC(2026, 0, 2),
    updatedBy: null,
  },
  {
    id: "market-item-sold",
    sellerId: "member-3",
    name: "Sigma 35mm",
    imageUrls: ["https://cdn.example.com/market/item-3.jpg"],
    manufacturer: "Sigma",
    productCode: "SIG-35",
    conditionGrade: "C" as const,
    description: null,
    price: 650000,
    status: "sold" as const,
    seller: {
      id: "member-3",
      name: "판매자3",
      image: null,
      role: "regular_member" as const,
    },
    createdAt: Date.UTC(2026, 0, 3),
    updatedAt: Date.UTC(2026, 0, 3),
    updatedBy: null,
  },
];

const flushEffects = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe("MarketPageClient", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    listMarketItemsMock.mockReset();
    listMarketItemsMock.mockResolvedValue(MARKET_ITEMS);

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

  it("판매글 목록을 카드 그리드로 렌더링한다", async () => {
    await act(async () => {
      root.render(<MarketPageClient viewer={DEFAULT_VIEWER} />);
      await flushEffects();
      await flushEffects();
    });

    expect(container.textContent).toContain("SONY A7");
    expect(container.textContent).toContain("1,200,000원");
    expect(container.textContent).toContain("판매자: 판매자1");
    expect(container.textContent).toContain("게시일:");
  });

  it("판매글 카드를 클릭할 수 있는 상세 페이지 링크로 렌더링한다", async () => {
    await act(async () => {
      root.render(<MarketPageClient viewer={DEFAULT_VIEWER} />);
      await flushEffects();
      await flushEffects();
    });

    const detailLink = container.querySelector(
      "a[data-testid='market-item-link-market-item-selling']",
    ) as HTMLAnchorElement | null;

    expect(detailLink).toBeInTheDocument();
    expect(detailLink?.getAttribute("href")).toBe("/dashboard/market/market-item-selling");
  });

  it("판매 상태를 색상 배지 클래스로 구분한다", async () => {
    await act(async () => {
      root.render(<MarketPageClient viewer={DEFAULT_VIEWER} />);
      await flushEffects();
      await flushEffects();
    });

    const sellingBadge = Array.from(container.querySelectorAll("span")).find(
      (element) => element.textContent === "판매중",
    );
    const reservedBadge = Array.from(container.querySelectorAll("span")).find(
      (element) => element.textContent === "예약중",
    );
    const soldBadge = Array.from(container.querySelectorAll("span")).find(
      (element) => element.textContent === "판매완료",
    );

    expect(sellingBadge?.className).toContain("text-emerald-700");
    expect(reservedBadge?.className).toContain("text-amber-700");
    expect(soldBadge?.className).toContain("text-slate-600");
  });

  it("판매글 작성 버튼은 작성 페이지 링크를 제공한다", async () => {
    await act(async () => {
      root.render(<MarketPageClient viewer={DEFAULT_VIEWER} />);
      await flushEffects();
      await flushEffects();
    });

    const createLink = container.querySelector(
      "a[href='/dashboard/market/new']",
    ) as HTMLAnchorElement | null;
    expect(createLink).toBeInTheDocument();
    expect(createLink?.textContent).toContain("판매글 작성");
  });
});
