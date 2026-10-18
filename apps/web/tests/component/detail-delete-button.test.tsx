import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithDashboardProviders } from "@/tests/setup/dashboard-providers";

const pushMock = vi.hoisted(() => vi.fn());
const deleteActivityMock = vi.hoisted(() => vi.fn());
const deleteExhibitionMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/features/dashboard/api/admin-api/resources", () => ({
  adminResourceApi: {
    deleteActivity: deleteActivityMock,
    deleteExhibition: deleteExhibitionMock,
  },
}));

import ActivityDeleteButton from "@/app/(dashboard)/dashboard/[generationName]/activities/_components/activity-delete-button";
import ExhibitionDeleteButton from "@/app/(dashboard)/dashboard/[generationName]/exhibitions/_components/exhibition-delete-button";

describe("상세 화면 삭제 버튼", () => {
  beforeEach(() => {
    pushMock.mockReset();
    deleteActivityMock.mockReset();
    deleteExhibitionMock.mockReset();
  });

  it("활동은 확인을 받은 뒤 삭제하고 목록으로 이동한다", async () => {
    const user = userEvent.setup();
    deleteActivityMock.mockResolvedValue(undefined);
    renderWithDashboardProviders(
      <ActivityDeleteButton activityId="act-1" generationPath="/dashboard/59기" />,
    );

    await user.click(screen.getByTestId("generation-activity-delete"));
    expect(
      await screen.findByText("정말 이 활동을 삭제하시겠습니까?"),
    ).toBeInTheDocument();
    await user.click(screen.getByTestId("confirm-dialog-accept"));

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/dashboard/59기/activities"),
    );
    expect(deleteActivityMock).toHaveBeenCalledWith("act-1");
  });

  it("확인을 취소하면 활동을 지우지 않는다", async () => {
    const user = userEvent.setup();
    renderWithDashboardProviders(
      <ActivityDeleteButton activityId="act-1" generationPath="/dashboard/59기" />,
    );

    await user.click(screen.getByTestId("generation-activity-delete"));
    await user.click(await screen.findByTestId("confirm-dialog-cancel"));

    expect(deleteActivityMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("전시 삭제가 실패하면 오류를 보여 주고 다시 누를 수 있다", async () => {
    const user = userEvent.setup();
    deleteExhibitionMock.mockRejectedValue(new Error("삭제 실패"));
    renderWithDashboardProviders(
      <ExhibitionDeleteButton exhibitionId="exh-1" generationPath="/dashboard/59기" />,
    );

    await user.click(screen.getByTestId("generation-exhibition-delete"));
    expect(
      await screen.findByText("정말 이 전시를 삭제하시겠습니까?"),
    ).toBeInTheDocument();
    await user.click(screen.getByTestId("confirm-dialog-accept"));

    expect(await screen.findByRole("alert")).toHaveTextContent("삭제 실패");
    expect(deleteExhibitionMock).toHaveBeenCalledWith("exh-1");
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("generation-exhibition-delete")).toBeEnabled();
  });
});
