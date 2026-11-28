import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import R2StorageUsageCard from "@/app/(dashboard)/_components/r2-storage-usage-card";

const stats = {
  usersTotal: 1,
  unverifiedUsersTotal: 0,
  generationsTotal: 1,
  selectedGenerationMembersTotal: 0,
  selectedGenerationActivitiesTotal: 0,
  selectedGenerationExhibitionsTotal: 0,
  linktreeLinksTotal: 0,
  r2StorageUsedBytes: 4 * 1024 * 1024 * 1024,
  r2StorageLimitBytes: 10 * 1024 * 1024 * 1024,
  r2StorageUsageAvailable: true,
} as const;

describe("R2StorageUsageCard", () => {
  it("사용량을 보여 준다", () => {
    render(<R2StorageUsageCard stats={stats} error={null} />);

    expect(screen.getByText("4 GB")).toBeInTheDocument();
    expect(screen.getByTestId("r2-usage-meter")).toBeInTheDocument();
  });

  // 통계 API는 운영진 이상만 읽을 수 있다. 일반 회원에게 항상 실패하는 카드를 보여 주지 않는다.
  it("볼 권한이 없는 역할에게는 카드를 그리지 않는다", () => {
    const { container } = render(
      <R2StorageUsageCard
        stats={null}
        error={{ reason: "forbidden", message: "forbidden", status: 403 }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  // 실패를 한 가지 문구로 뭉개면 원인을 알 수 없다. 어디서 막혔는지 구분해서 보여 준다.
  it.each([
    ["unauthorized", "로그인이 만료되었습니다"],
    ["invalid_response", "서버 응답 형식이 예상과 달라"],
    ["request_failed", "서버에 연결하지 못했습니다"],
  ] as const)("조회 실패(%s)는 이유를 알려 준다", (reason, message) => {
    render(
      <R2StorageUsageCard stats={null} error={{ reason, message: "x", status: null }} />,
    );

    expect(screen.getByText(new RegExp(message))).toBeInTheDocument();
  });

  it.each([
    ["partial", "파일이 많아 집계를 끝내지 못했습니다"],
    ["scan_failed", "저장소를 읽는 중 오류가 발생했습니다"],
    ["binding_missing", "저장소 연결 설정이 없습니다"],
  ] as const)("집계 실패(%s)는 이유를 알려 준다", (usageReason, message) => {
    render(
      <R2StorageUsageCard
        stats={{
          ...stats,
          r2StorageUsageAvailable: false,
          r2StorageUsageReason: usageReason,
        }}
        error={null}
      />,
    );

    expect(screen.getByText(new RegExp(message))).toBeInTheDocument();
  });
});
