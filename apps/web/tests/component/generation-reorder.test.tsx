import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApiGeneration } from "@yonyoung/contracts";

import { renderWithDashboardProviders } from "../setup/dashboard-providers";

const refreshMock = vi.hoisted(() => vi.fn());
const reorderGenerationsMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock, push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/features/dashboard/api/admin-api/resources", () => ({
  adminResourceApi: {
    reorderGenerations: reorderGenerationsMock,
  },
}));

import GenerationManagementClient from "@/app/(dashboard)/dashboard/settings/generations/generation-management-client";

const generation = (id: string, name: string, sortOrder: number): ApiGeneration => ({
  id,
  name,
  sortOrder,
  startDate: Date.parse("2030-03-01T00:00:00.000Z"),
  endDate: Date.parse("2030-12-31T00:00:00.000Z"),
  createdAt: 1,
  updatedAt: 1,
  updatedBy: null,
});

describe("기수 순서 이동", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    reorderGenerationsMock.mockReset();
  });

  it("위로 이동하면 바로 위 기수와 정렬 순서를 한 요청으로 맞바꾼다", async () => {
    const gen59 = generation("gen-59", "59기", 59);
    const gen58 = generation("gen-58", "58기", 58);
    reorderGenerationsMock.mockResolvedValue([
      { ...gen58, sortOrder: 59 },
      { ...gen59, sortOrder: 58 },
    ]);
    const user = userEvent.setup();

    renderWithDashboardProviders(
      <GenerationManagementClient
        initialGenerations={[gen58, gen59]}
        initialUsers={[]}
      />,
    );

    // 목록은 정렬 순서 내림차순이라 가장 위(59기)는 위로 갈 수 없다.
    expect(screen.getByTestId("generation-move-up-gen-59")).toBeDisabled();
    expect(screen.getByTestId("generation-move-down-gen-58")).toBeDisabled();

    await user.click(screen.getByTestId("generation-move-up-gen-58"));

    expect(reorderGenerationsMock).toHaveBeenCalledWith({
      items: [
        { id: "gen-58", sortOrder: 59 },
        { id: "gen-59", sortOrder: 58 },
      ],
    });
    await waitFor(() => {
      const names = screen
        .getAllByTestId(/^generation-select-/)
        .map((element) => element.textContent ?? "");
      expect(names[0]).toContain("58기");
    });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("실패하면 오류를 보여 주고 순서를 바꾸지 않는다", async () => {
    reorderGenerationsMock.mockRejectedValue(new Error("충돌"));
    const user = userEvent.setup();

    renderWithDashboardProviders(
      <GenerationManagementClient
        initialGenerations={[
          generation("gen-58", "58기", 58),
          generation("gen-59", "59기", 59),
        ]}
        initialUsers={[]}
      />,
    );

    await user.click(screen.getByTestId("generation-move-down-gen-59"));

    expect(await screen.findByText("충돌")).toBeInTheDocument();
    const names = screen
      .getAllByTestId(/^generation-select-/)
      .map((element) => element.textContent ?? "");
    expect(names[0]).toContain("59기");
  });
});
