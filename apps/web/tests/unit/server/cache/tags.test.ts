import { describe, expect, it, vi, beforeEach } from "vitest";

/*
  캐시 무효화 정확도 회귀 테스트.

  상세 읽기(`getPublicActivityById` / `getPublicExhibitionById`)는 컬렉션 태그가
  아니라 엔티티 태그(`public:activity:<id>`)만 갖는다. 그래서 "게시물 하나를 고칠 때
  그 상세와 목록만 버리고, 다른 게시물의 상세는 그대로 둔다"는 계약이 성립한다.
  이 계약이 깨지면 두 방향 모두 문제가 된다.
    - 엔티티 태그를 빠뜨리면 → 수정한 게시물이 낡은 채로 계속 서빙된다(정확성 사고)
    - 컬렉션 태그로 되돌리면 → 게시물 하나 수정에 상세 전부가 무효화된다(성능 회귀)
*/

const updateTag = vi.fn<(tag: string) => void>();
const requireAdminAccess = vi.fn(async () => {});
const honoRequest = vi.fn(async () => ({ id: "act-1" }));

vi.mock("next/cache", () => ({
  updateTag: (tag: string) => updateTag(tag),
  cacheLife: () => {},
  cacheTag: () => {},
  revalidateTag: () => {},
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-request-id": "req", "x-trace-id": "trace" }),
}));

vi.mock("@/features/auth/server/auth-guard", () => ({
  serverAuthGuard: {
    requireSession: async () => ({
      session: { id: "s", userId: "u", expiresAt: 0 },
      user: { id: "u", email: "a@b.c", name: "n", role: "president" },
    }),
  },
}));

vi.mock("@/features/dashboard/actions/admin-write-access", () => ({
  assertAdminWriteAccess: () => {},
}));

vi.mock("@/shared/http/http", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, readCookieHeader: async () => "cookie=1" };
});

vi.mock("@/server/http/hono-client", () => ({
  HonoApiError: class HonoApiError extends Error {},
  honoRequest: (...args: unknown[]) => honoRequest(...(args as [])),
}));

const collectTags = async (run: () => Promise<unknown>): Promise<string[]> => {
  updateTag.mockClear();
  await run();
  return updateTag.mock.calls.map(([tag]) => tag);
};

describe("공개 캐시 태그 무효화 범위", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminAccess.mockClear();
  });

  it("활동 수정은 목록과 그 활동의 상세만 무효화한다", async () => {
    const { updateActivityAction } =
      await import("@/features/dashboard/actions/activities");

    const tags = await collectTags(() =>
      updateActivityAction("act-1", { title: "새 제목" }),
    );

    expect(tags).toContain("public:activities");
    expect(tags).toContain("public:activity:act-1");
    expect(tags).toContain("admin:activities");
    // 다른 활동의 상세는 건드리지 않는다 — 이게 이 설계의 존재 이유다.
    expect(
      tags.some(
        (tag) => tag.startsWith("public:activity:") && tag !== "public:activity:act-1",
      ),
    ).toBe(false);
  });

  it("활동 이미지 변경도 그 활동의 상세를 무효화한다", async () => {
    const { deleteActivityImageAction } =
      await import("@/features/dashboard/actions/activities");

    const tags = await collectTags(() => deleteActivityImageAction("act-9", "img-1"));

    expect(tags).toContain("public:activity:act-9");
    expect(tags).toContain("public:activities");
  });

  it("활동 생성은 상세 태그를 건드리지 않는다 (아직 캐시된 상세가 없다)", async () => {
    const { createActivityAction } =
      await import("@/features/dashboard/actions/activities");

    const tags = await collectTags(() =>
      createActivityAction({
        title: "새 활동",
        description: "<p>내용</p>",
        coverImageUrl: "https://storage.yonyoung.moveto.kr/a.jpg",
        startDate: 0,
        endDate: 0,
        generationId: "gen-1",
      } as never),
    );

    expect(tags).toContain("public:activities");
    expect(tags.some((tag) => tag.startsWith("public:activity:"))).toBe(false);
  });

  it("전시 수정은 목록과 그 전시의 상세만 무효화한다", async () => {
    const { updateExhibitionAction } =
      await import("@/features/dashboard/actions/exhibitions");

    const tags = await collectTags(() =>
      updateExhibitionAction("exh-1", { title: "새 전시명" }),
    );

    expect(tags).toContain("public:exhibitions");
    expect(tags).toContain("public:exhibition:exh-1");
    expect(
      tags.some(
        (tag) =>
          tag.startsWith("public:exhibition:") && tag !== "public:exhibition:exh-1",
      ),
    ).toBe(false);
  });
});
