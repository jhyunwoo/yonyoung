import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import type { ApiRecruitingPlan } from "@yonyoung/contracts";

const refreshMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

vi.mock("@/features/dashboard/api/admin-api/resources", () => ({
  adminResourceApi: {
    upsertCurrentRecruitingPlan: vi.fn(),
  },
}));

vi.mock("@/app/(dashboard)/_components/rich-text-editor", () => ({
  default: ({ value }: { value: string }) => (
    <div data-testid="rich-text-editor">{value}</div>
  ),
}));

import RecruitingPlanSettingsForm from "@/app/(dashboard)/dashboard/settings/recruiting/recruiting-plan-settings-form";

const plan: ApiRecruitingPlan = {
  year: 2030,
  title: "2030 연영회 신입 부원 모집",
  content: "<p>세부 내용</p>",
  promotionImageUrls: [],
  recruitmentStartAt: new Date(2030, 2, 1, 9, 30).getTime(),
  recruitmentEndAt: new Date(2030, 2, 15, 18, 0).getTime(),
  createdAt: 0,
  updatedAt: 0,
};

describe("RecruitingPlanSettingsForm", () => {
  beforeEach(() => {
    refreshMock.mockReset();
  });

  it("서버가 내려 준 현재 모집 계획으로 폼을 채운다", () => {
    render(<RecruitingPlanSettingsForm initialPlan={plan} />);

    expect(screen.getByDisplayValue(plan.title)).toBeInTheDocument();
    expect(screen.getByLabelText("모집 시작일시")).toHaveValue("2030-03-01T09:30");
    expect(screen.getByLabelText("모집 종료일시")).toHaveValue("2030-03-15T18:00");
    expect(screen.getByTestId("rich-text-editor")).toHaveTextContent("세부 내용");
  });

  it("모집 계획이 아직 없으면 빈 폼을 보여 준다", () => {
    render(<RecruitingPlanSettingsForm initialPlan={null} />);

    expect(screen.getByPlaceholderText("예: 2030 연영회 신입 부원 모집")).toHaveValue("");
    expect(screen.getByLabelText("모집 시작일시")).toHaveValue("");
    expect(screen.getByText("등록된 홍보 이미지가 없습니다.")).toBeInTheDocument();
  });

  it("서버 렌더에서는 시간대에 따라 달라지는 일시를 비우고 입력을 막는다", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(
      <RecruitingPlanSettingsForm initialPlan={plan} />,
    );

    const dateInputs = container.querySelectorAll('input[type="datetime-local"]');
    expect(dateInputs).toHaveLength(2);
    for (const input of dateInputs) {
      expect(input).toHaveValue("");
      expect(input).toBeDisabled();
    }
    expect(
      container.querySelector('[data-testid="recruiting-plan-save"]'),
    ).toBeDisabled();
  });
});
