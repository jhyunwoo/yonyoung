import { describe, expect, it, vi } from "vitest";
import {
  ORPHAN_SWEEP_MIN_OBJECT_AGE_MS,
  ORPHAN_SWEEP_SOFT_DELETE_GRACE_MS,
  extractManagedObjectKeys,
  runR2OrphanSweep,
} from "../lib/storage/orphan-sweep";

const NOW = Date.parse("2031-06-01T00:00:00.000Z");
const OLD = new Date(NOW - ORPHAN_SWEEP_MIN_OBJECT_AGE_MS - 1000);
const RECENT = new Date(NOW - 60 * 1000);

const KEYS = {
  liveCover: "activities/user-1/cover/aaaa-cover.jpg",
  recentlyDeleted: "activities/user-1/detail/bbbb-detail.jpg",
  longDeleted: "activities/user-1/detail/cccc-detail.jpg",
  orphan: "exhibitions/user-2/detail/dddd-detail.jpg",
  freshUpload: "exhibitions/user-2/detail/eeee-detail.jpg",
  richText: "exhibitions/user-2/detail/ffff-inline.jpg",
  unmanaged: "legacy/some-file.jpg",
};

const signedUrl = (key: string) =>
  `https://yonyoung.example/api/public/media/${key
    .split("/")
    .map(encodeURIComponent)
    .join("/")}?sig=abc`;

const createDatabase = (tables: Record<string, Record<string, unknown>[]>, fail = false) => ({
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

const createBucket = (objects: { key: string; uploaded: Date }[]) => ({
  list: vi.fn(async ({ prefix }: { prefix?: string }) => ({
    objects: objects.filter((object) => object.key.startsWith(prefix ?? "")),
    truncated: false,
  })),
  delete: vi.fn(async () => undefined),
});

const fixture = () => {
  const database = createDatabase({
    activities: [{ a: signedUrl(KEYS.liveCover), b: "<p>본문</p>", deleted_at: null }],
    activity_images: [
      {
        a: signedUrl(KEYS.recentlyDeleted),
        deleted_at: NOW - ORPHAN_SWEEP_SOFT_DELETE_GRACE_MS + 60_000,
      },
      { a: signedUrl(KEYS.longDeleted), deleted_at: NOW - ORPHAN_SWEEP_SOFT_DELETE_GRACE_MS - 1 },
    ],
    exhibitions: [
      { a: null, b: `<img src="${signedUrl(KEYS.richText)}">`, deleted_at: null },
    ],
  });
  const bucket = createBucket([
    { key: KEYS.liveCover, uploaded: OLD },
    { key: KEYS.recentlyDeleted, uploaded: OLD },
    { key: KEYS.longDeleted, uploaded: OLD },
    { key: KEYS.orphan, uploaded: OLD },
    { key: KEYS.freshUpload, uploaded: RECENT },
    { key: KEYS.richText, uploaded: OLD },
    { key: KEYS.unmanaged, uploaded: OLD },
  ]);
  return { database, bucket };
};

describe("R2 orphan sweep", () => {
  it("URL 인코딩된 서명 URL과 리치텍스트에서도 객체 키를 찾는다", () => {
    expect(extractManagedObjectKeys(signedUrl(KEYS.liveCover))).toEqual([KEYS.liveCover]);
    expect(
      extractManagedObjectKeys(`<p><img src="${signedUrl(KEYS.richText)}"></p>`),
    ).toEqual([KEYS.richText]);
    expect(extractManagedObjectKeys(null)).toEqual([]);
  });

  it("dry-run은 고아만 찾아내고 아무것도 지우지 않는다", async () => {
    const { database, bucket } = fixture();

    const result = await runR2OrphanSweep({ database: database as never, bucket: bucket as never, enabled: false, now: NOW });

    expect(result).toMatchObject({ mode: "dry-run", orphanCount: 2, deletedCount: 0 });
    expect(bucket.delete).not.toHaveBeenCalled();
  });

  it("활성화하면 오래된 고아와 유예가 지난 soft delete 객체만 지운다", async () => {
    const { database, bucket } = fixture();

    const result = await runR2OrphanSweep({ database: database as never, bucket: bucket as never, enabled: true, now: NOW });

    expect(result.deletedCount).toBe(2);
    expect(bucket.delete).toHaveBeenCalledTimes(1);
    const deleted = (bucket.delete.mock.calls[0] as unknown as [string[]])[0];
    expect(new Set(deleted)).toEqual(new Set([KEYS.orphan, KEYS.longDeleted]));
  });

  it("한 번에 지우는 수를 제한한다", async () => {
    const { database, bucket } = fixture();

    const result = await runR2OrphanSweep({
      database: database as never,
      bucket: bucket as never,
      enabled: true,
      now: NOW,
      maxDeletes: 1,
    });

    expect(result.orphanCount).toBe(2);
    expect(result.deletedCount).toBe(1);
  });

  it("참조 조회가 실패하면 아무것도 지우지 않고 실패한다", async () => {
    const bucket = createBucket([{ key: KEYS.orphan, uploaded: OLD }]);

    await expect(
      runR2OrphanSweep({
        database: createDatabase({}, true) as never,
        bucket: bucket as never,
        enabled: true,
        now: NOW,
      }),
    ).rejects.toThrow();
    expect(bucket.delete).not.toHaveBeenCalled();
    expect(bucket.list).not.toHaveBeenCalled();
  });
});
