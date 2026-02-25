import { describe, expect, it } from "vitest";
import {
  AdminApiError,
  type ApiGenerationNotice,
} from "../../../lib/admin-api/types";
import {
  buildNoticePreview,
  buildRoleLabel,
  normalizeNoticeImageUrls,
  normalizeNotices,
  readNoticeErrorMessage,
  toNoticeItem,
} from "./notice-shared";

const createNotice = (
  id: string,
  createdAt: number,
  title = "공지",
): ApiGenerationNotice => ({
  id,
  generationId: "generation-id",
  title,
  content: `${title} 본문`,
  imageUrls: [],
  author: {
    id: "author-id",
    name: "작성자",
    image: null,
    role: "president",
  },
  createdAt,
  updatedAt: createdAt,
  updatedBy: null,
});

describe("normalizeNotices", () => {
  it("최근 생성 공지가 먼저 오도록 정렬한다", () => {
    const notices = [
      createNotice("old", 1_700_000_000_000),
      createNotice("new", 1_800_000_000_000),
      createNotice("middle", 1_750_000_000_000),
    ];

    const normalized = normalizeNotices(notices);

    expect(normalized.map((notice) => notice.id)).toEqual([
      "new",
      "middle",
      "old",
    ]);
  });
});

describe("buildNoticePreview", () => {
  it("여러 줄 공백을 정규화하고 길이를 제한한다", () => {
    const preview = buildNoticePreview(
      "첫 줄입니다.\n\n두 번째 줄입니다.\n세 번째 줄입니다.",
      12,
    );

    expect(preview).toBe("첫 줄입니다. 두 번째...");
  });
});

describe("buildRoleLabel", () => {
  it("관리자 역할을 한글 라벨로 반환한다", () => {
    expect(buildRoleLabel("president")).toBe("회장");
    expect(buildRoleLabel("vice_president")).toBe("부회장");
    expect(buildRoleLabel("manager")).toBe("부장");
  });
});

describe("readNoticeErrorMessage", () => {
  it("AdminApiError 메시지를 우선 사용한다", () => {
    const message = readNoticeErrorMessage(
      new AdminApiError({
        status: 400,
        code: "BAD_REQUEST",
        message: "검증 실패",
      }),
    );

    expect(message).toBe("검증 실패");
  });
});

describe("toNoticeItem", () => {
  it("첨부 이미지 목록을 포함해 매핑한다", () => {
    const row = createNotice("notice-1", 1_800_000_000_000, "이미지 공지");
    row.imageUrls = [
      "https://cdn.example.com/notices/1.jpg",
      "https://cdn.example.com/notices/2.jpg",
    ];

    const mapped = toNoticeItem(row);

    expect(mapped.imageUrls).toEqual(row.imageUrls);
  });
});

describe("normalizeNoticeImageUrls", () => {
  it("유효하지 않은 URL과 중복을 제거하고 최대 10장까지만 유지한다", () => {
    const input = [
      "https://cdn.example.com/notices/1.jpg",
      "invalid-url",
      "https://cdn.example.com/notices/2.jpg",
      "https://cdn.example.com/notices/1.jpg",
      "https://cdn.example.com/notices/3.jpg",
      "https://cdn.example.com/notices/4.jpg",
      "https://cdn.example.com/notices/5.jpg",
      "https://cdn.example.com/notices/6.jpg",
      "https://cdn.example.com/notices/7.jpg",
      "https://cdn.example.com/notices/8.jpg",
      "https://cdn.example.com/notices/9.jpg",
      "https://cdn.example.com/notices/10.jpg",
      "https://cdn.example.com/notices/11.jpg",
    ];

    const normalized = normalizeNoticeImageUrls(input);

    expect(normalized).toHaveLength(10);
    expect(normalized).not.toContain("invalid-url");
    expect(normalized).toEqual([
      "https://cdn.example.com/notices/1.jpg",
      "https://cdn.example.com/notices/2.jpg",
      "https://cdn.example.com/notices/3.jpg",
      "https://cdn.example.com/notices/4.jpg",
      "https://cdn.example.com/notices/5.jpg",
      "https://cdn.example.com/notices/6.jpg",
      "https://cdn.example.com/notices/7.jpg",
      "https://cdn.example.com/notices/8.jpg",
      "https://cdn.example.com/notices/9.jpg",
      "https://cdn.example.com/notices/10.jpg",
    ]);
  });
});
