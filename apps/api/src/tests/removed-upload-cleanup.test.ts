import { describe, expect, it, vi } from "vitest";
import {
  collectRemovedObjectKeys,
  deleteUnreferencedObjects,
} from "../lib/storage/removed-upload-cleanup";

const KEYS = {
  removed: "activities/user-1/detail/aaaa-removed.jpg",
  stillUsed: "activities/user-1/cover/bbbb-shared.jpg",
  inRichText: "exhibitions/user-2/detail/cccc-inline.jpg",
  softDeletedOnly: "users/user-3/profile/dddd-old.jpg",
  kept: "users/user-3/profile/eeee-kept.jpg",
};

const signedUrl = (key: string) =>
  `https://yonyoung.example/api/public/media/${key
    .split("/")
    .map(encodeURIComponent)
    .join("/")}?sig=abc`;

const createDatabase = (
  tables: Record<string, Record<string, unknown>[]>,
  fail = false,
) => ({
  prepare: vi.fn((query: string) => ({
    all: async () => {
      if (fail) {
        throw new Error("D1_ERROR: no such table");
      }
      const table = Object.keys(tables).find((name) =>
        query.includes(`FROM ${name}`),
      );
      return { results: table ? tables[table] : [] };
    },
  })),
});

describe("collectRemovedObjectKeys", () => {
  it("이전 값에만 있는 관리 객체 키를 돌려준다", () => {
    expect(
      collectRemovedObjectKeys(
        [
          signedUrl(KEYS.removed),
          [signedUrl(KEYS.kept), signedUrl(KEYS.softDeletedOnly)],
          `<p><img src="${signedUrl(KEYS.inRichText)}"></p>`,
          null,
          "https://example.com/external.png",
        ],
        [signedUrl(KEYS.kept), `<img src="${signedUrl(KEYS.inRichText)}">`],
      ).sort(),
    ).toEqual([KEYS.removed, KEYS.softDeletedOnly].sort());
  });

  it("바뀐 것이 없으면 빈 목록이다", () => {
    expect(
      collectRemovedObjectKeys([signedUrl(KEYS.kept)], [signedUrl(KEYS.kept)]),
    ).toEqual([]);
  });
});

describe("deleteUnreferencedObjects", () => {
  it("살아 있는 행이 더는 가리키지 않는 객체만 지운다", async () => {
    const database = createDatabase({
      activities: [
        { a: signedUrl(KEYS.stillUsed), b: "<p>본문</p>", deleted_at: null },
      ],
      exhibitions: [
        {
          a: null,
          b: `<img src="${signedUrl(KEYS.inRichText)}">`,
          deleted_at: null,
        },
      ],
      // soft delete된 행은 참조로 보지 않는다.
      '"user"': [{ a: signedUrl(KEYS.softDeletedOnly), deleted_at: 1 }],
    });
    const bucket = { delete: vi.fn(async () => undefined) };

    const deleted = await deleteUnreferencedObjects({
      database: database as never,
      bucket,
      keys: [
        KEYS.removed,
        KEYS.stillUsed,
        KEYS.inRichText,
        KEYS.softDeletedOnly,
      ],
    });

    expect(deleted.sort()).toEqual([KEYS.removed, KEYS.softDeletedOnly].sort());
    expect(bucket.delete).toHaveBeenCalledTimes(1);
    expect(
      [...(bucket.delete.mock.calls[0] as unknown as [string[]])[0]].sort(),
    ).toEqual([KEYS.removed, KEYS.softDeletedOnly].sort());
  });

  it("관리 형식이 아닌 키는 건드리지 않는다", async () => {
    const bucket = { delete: vi.fn(async () => undefined) };

    const deleted = await deleteUnreferencedObjects({
      database: createDatabase({}) as never,
      bucket,
      keys: ["legacy/some-file.jpg", "_system/state.json", "../etc/passwd"],
    });

    expect(deleted).toEqual([]);
    expect(bucket.delete).not.toHaveBeenCalled();
  });

  it("참조 조회가 실패하면 아무것도 지우지 않고 실패한다", async () => {
    const bucket = { delete: vi.fn(async () => undefined) };

    await expect(
      deleteUnreferencedObjects({
        database: createDatabase({}, true) as never,
        bucket,
        keys: [KEYS.removed],
      }),
    ).rejects.toThrow();
    expect(bucket.delete).not.toHaveBeenCalled();
  });
});
