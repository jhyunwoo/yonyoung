import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithDashboardProviders as render } from "@/tests/setup/dashboard-providers";
import type { ApiGeneration, ApiUser } from "@/shared/contracts/api-contracts";
import { AdminApiError } from "@/shared/http/http";
const bulkUpdateUsersRoleMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/dashboard/api/admin-api/resources", () => ({
  adminResourceApi: {
    bulkUpdateUsersRole: bulkUpdateUsersRoleMock,
  },
}));

import MembersGrid from "@/app/(dashboard)/dashboard/settings/members/members-grid";

const generations: ApiGeneration[] = [
  {
    id: "gen-59",
    name: "59기",
    sortOrder: 59,
    startDate: 59,
    endDate: 59,
    createdAt: 59,
    updatedAt: 59,
    updatedBy: null,
  },
  {
    id: "gen-58",
    name: "58기",
    sortOrder: 58,
    startDate: 58,
    endDate: 58,
    createdAt: 58,
    updatedAt: 58,
    updatedBy: null,
  },
];

const createUser = (
  input: Partial<ApiUser> & Pick<ApiUser, "id" | "name" | "email">,
): ApiUser => ({
  id: input.id,
  name: input.name,
  email: input.email,
  image: input.image ?? null,
  showcaseImageUrls: input.showcaseImageUrls ?? [],
  familyName: input.familyName ?? null,
  givenName: input.givenName ?? null,
  college: input.college ?? null,
  department: input.department ?? null,
  studentNumber: input.studentNumber ?? null,
  phoneNumber: input.phoneNumber ?? null,
  collaborationAvailable: input.collaborationAvailable ?? false,
  personalLink: input.personalLink ?? null,
  role: input.role ?? "regular_member",
  generationId: input.generationId ?? null,
  generationIds: input.generationIds ?? [],
  createdAt: input.createdAt ?? 1,
  updatedAt: input.updatedAt ?? 1,
  updatedBy: input.updatedBy ?? null,
});

const users: ApiUser[] = [
  createUser({
    id: "user-1",
    name: "legacy-kim",
    email: "kim@example.com",
    familyName: "김",
    givenName: "연영",
    college: "공과대학",
    department: "컴퓨터과학과",
    studentNumber: "2023000001",
    phoneNumber: "010-1111-1111",
    role: "regular_member",
    generationId: "gen-59",
    generationIds: ["gen-59", "gen-58"],
  }),
  createUser({
    id: "user-2",
    name: "legacy-choi",
    email: "choi@example.com",
    familyName: "최",
    givenName: "부원",
    college: "공과대학",
    department: "산업공학과",
    studentNumber: "2022000002",
    phoneNumber: "010-2222-2222",
    role: "associate_member",
    generationId: "gen-59",
    generationIds: ["gen-59"],
  }),
  createUser({
    id: "user-3",
    name: "legacy-park",
    email: "park@example.com",
    familyName: "박",
    givenName: "신입",
    college: "문과대학",
    department: "국어국문학과",
    studentNumber: "2024000003",
    phoneNumber: "010-3333-3333",
    role: "new_member",
    generationId: null,
    generationIds: [],
  }),
];

describe("MembersGrid", () => {
  // 초기 목록은 서버 컴포넌트가 읽어 props로 내려준다.
  const renderGrid = () =>
    render(
      <MembersGrid
        initialUsers={users.map((user) => ({ ...user }))}
        generations={generations.map((generation) => ({ ...generation }))}
      />,
    );

  beforeEach(() => {
    vi.restoreAllMocks();
    bulkUpdateUsersRoleMock.mockReset();
  });

  it("selects visible users and merges updated roles after bulk update", async () => {
    bulkUpdateUsersRoleMock.mockImplementation(
      async (input: { userIds: string[]; role: string }) =>
        users
          .filter((user) => input.userIds.includes(user.id))
          .map((user) => ({
            ...user,
            role: input.role,
            updatedAt: 99,
          })),
    );

    renderGrid();

    await screen.findByText("김연영");
    expect(screen.getByTestId("settings-members-open-user-1")).toHaveAttribute(
      "href",
      "/dashboard/settings/members/user-1",
    );
    expect(screen.getByTestId("settings-members-detail-link-user-1")).toHaveAttribute(
      "href",
      "/dashboard/settings/members/user-1",
    );
    expect(
      screen.queryByRole("option", {
        name: "회장",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("option", {
        name: "부회장",
      }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByTestId("settings-members-search-input"), {
      target: { value: "김" },
    });

    await waitFor(() => {
      expect(screen.queryByText("최부원")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("settings-members-select-visible-users"));
    expect(screen.getByTestId("settings-members-selection-summary")).toHaveTextContent(
      "선택된 멤버 1명",
    );

    fireEvent.change(screen.getByTestId("settings-members-bulk-role-select"), {
      target: { value: "manager" },
    });
    fireEvent.click(screen.getByTestId("settings-members-bulk-role-submit"));

    // window.confirm 대신 커스텀 확인 다이얼로그가 뜬다.
    expect(
      await screen.findByText("선택한 멤버 1명의 권한을 부장(으)로 변경하시겠습니까?"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("confirm-dialog-accept"));

    await waitFor(() => {
      expect(bulkUpdateUsersRoleMock).toHaveBeenCalledWith({
        userIds: ["user-1"],
        role: "manager",
      });
    });

    expect(
      await screen.findByText("1명의 권한을 부장(으)로 변경했습니다."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("settings-members-selection-summary")).toHaveTextContent(
      "멤버를 선택해 권한을 한 번에 변경할 수 있습니다.",
    );
    expect(screen.getByTestId("settings-members-select-user-1")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(
      within(screen.getByTestId("settings-members-card-user-1")).getByText("부장"),
    ).toBeInTheDocument();
  });

  it("keeps selection when bulk role update fails", async () => {
    bulkUpdateUsersRoleMock.mockRejectedValue(
      new AdminApiError({
        status: 403,
        code: "FORBIDDEN",
        message: "본인보다 높거나 같은 등급의 사용자는 변경할 수 없습니다.",
      }),
    );

    renderGrid();

    await screen.findByText("김연영");
    fireEvent.click(screen.getByTestId("settings-members-select-user-1"));
    fireEvent.click(screen.getByTestId("settings-members-bulk-role-submit"));

    fireEvent.click(await screen.findByTestId("confirm-dialog-accept"));

    expect(
      await screen.findByText("본인보다 높거나 같은 등급의 사용자는 변경할 수 없습니다."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("settings-members-select-user-1")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("settings-members-selection-summary")).toHaveTextContent(
      "선택된 멤버 1명",
    );
  });
});
