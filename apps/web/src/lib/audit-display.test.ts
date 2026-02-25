import { describe, expect, it } from "vitest";
import type { ApiAuditAction } from "@repo/shared-api-contracts";
import { formatAuditActionLabel, formatAuditActor } from "./audit-display";

describe("audit-display helpers", () => {
  it("감사 actor가 없으면 기본 텍스트를 반환한다", () => {
    expect(formatAuditActor(null)).toBe("알 수 없음");
  });

  it("role이 있으면 역할 라벨을 포함해 actor를 포맷한다", () => {
    expect(
      formatAuditActor({
        id: "actor-1",
        name: "홍길동",
        role: "manager",
      }),
    ).toContain("홍길동 (");
  });

  it("role이 없으면 역할 미지정으로 표기한다", () => {
    expect(
      formatAuditActor({
        id: "actor-2",
        name: "익명",
        role: null,
      }),
    ).toBe("익명 (역할 미지정)");
  });

  it("감사 액션 라벨을 한글로 변환한다", () => {
    expect(formatAuditActionLabel("create")).toBe("생성");
    expect(formatAuditActionLabel("update")).toBe("수정");
    expect(formatAuditActionLabel("delete")).toBe("삭제");
  });

  it("알 수 없는 액션은 원문을 유지한다", () => {
    expect(formatAuditActionLabel("unknown" as ApiAuditAction)).toBe("unknown");
  });
});
