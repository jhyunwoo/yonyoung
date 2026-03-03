import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const getMarketItemByIdMock = vi.hoisted(() => vi.fn());
const listMarketCommentsByItemIdMock = vi.hoisted(() => vi.fn());
const updateMarketItemStatusMock = vi.hoisted(() => vi.fn());
const createMarketCommentMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/dashboard/api/admin-api/resources", () => ({
  adminResourceApi: {
    getMarketItemById: getMarketItemByIdMock,
    listMarketCommentsByItemId: listMarketCommentsByItemIdMock,
    updateMarketItemStatus: updateMarketItemStatusMock,
    createMarketComment: createMarketCommentMock,
    upsertMarketPushSubscription: vi.fn(),
    deleteMarketPushSubscription: vi.fn(),
  },
}));

import MarketItemDetailPageClient from "@/app/(dashboard)/dashboard/market/[itemId]/market-item-detail-page-client";

describe("MarketItemDetailPageClient", () => {
  beforeEach(() => {
    getMarketItemByIdMock.mockReset();
    listMarketCommentsByItemIdMock.mockReset();
    updateMarketItemStatusMock.mockReset();
    createMarketCommentMock.mockReset();

    getMarketItemByIdMock.mockResolvedValue({
      id: "market-1",
      sellerId: "user-member",
      name: "필름 카메라",
      imageUrls: ["https://cdn.mock.local/market-1.jpg"],
      manufacturer: "Canon",
      productCode: "AE-1",
      conditionGrade: "B",
      description: "정상 작동",
      price: 120000,
      status: "selling",
      seller: { id: "user-member", name: "최부원", image: null, role: "regular_member" },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      updatedBy: null,
    });
    listMarketCommentsByItemIdMock.mockResolvedValue([
      {
        id: "c-1",
        itemId: "market-1",
        author: { id: "u2", name: "박부장", image: null, role: "manager" },
        content: "관심 있습니다!",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        updatedBy: null,
      },
    ]);
  });

  it("updates item status and creates comments", async () => {
    updateMarketItemStatusMock.mockResolvedValue({
      id: "market-1",
      sellerId: "user-member",
      name: "필름 카메라",
      imageUrls: ["https://cdn.mock.local/market-1.jpg"],
      manufacturer: "Canon",
      productCode: "AE-1",
      conditionGrade: "B",
      description: "정상 작동",
      price: 120000,
      status: "reserved",
      seller: { id: "user-member", name: "최부원", image: null, role: "regular_member" },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      updatedBy: null,
    });
    createMarketCommentMock.mockResolvedValue({
      id: "c-2",
      itemId: "market-1",
      author: { id: "user-member", name: "최부원", image: null, role: "regular_member" },
      content: "채팅 주세요",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      updatedBy: null,
    });

    const user = userEvent.setup();
    render(
      <MarketItemDetailPageClient
        itemId="market-1"
        viewer={{ id: "user-member", displayName: "최부원", role: "regular_member" }}
      />,
    );

    expect(await screen.findByRole("heading", { name: "필름 카메라" })).toBeInTheDocument();
    expect(await screen.findByText("관심 있습니다!")).toBeInTheDocument();

    await user.click(screen.getByTestId("market-status-reserved"));
    await waitFor(() => {
      expect(updateMarketItemStatusMock).toHaveBeenCalledWith("market-1", {
        status: "reserved",
      });
    });

    await user.type(screen.getByPlaceholderText("댓글 작성"), "채팅 주세요");
    await user.click(screen.getByTestId("market-comment-submit"));

    await waitFor(() => {
      expect(createMarketCommentMock).toHaveBeenCalledWith("market-1", {
        content: "채팅 주세요",
      });
    });
    expect(await screen.findByText("채팅 주세요")).toBeInTheDocument();
  });
});
