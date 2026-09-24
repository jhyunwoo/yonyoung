import { toTimestampDate } from "../../platform/db/row-values";
import { logger } from "../../shared/logging/logger";
import {
  MANAGED_UPLOAD_RESOURCE_PATHS,
  parseManagedObjectKey,
} from "./presign";

/**
 * R2에 남은 고아 객체(어떤 행도 가리키지 않는 업로드)를 정리한다.
 *
 * 이미지·첨부를 지우거나 저장을 중간에 포기해도 R2 객체는 남는다. 업로드는 버킷 10GB 한도를
 * fail-closed로 집행하므로, 정리하지 않으면 언젠가 모든 업로드가 413으로 막힌다.
 *
 * 안전장치
 * - 기본은 dry-run(로그만). `R2_ORPHAN_SWEEP_ENABLED="true"`일 때만 실제로 지운다.
 * - 참조 조회가 하나라도 실패하면 아무것도 지우지 않는다(참조를 모르면 전부 사용 중으로 본다).
 * - soft delete된 행도 삭제 후 30일까지는 참조로 본다(복구 여지).
 * - 올린 지 7일이 안 된 객체는 건드리지 않는다(저장 중인 업로드·예약 보호).
 * - 관리 형식(`<resource>/<actor>/<slot>/<token>`)의 키만 대상이며 한 번에 지우는 수를 제한한다.
 */

export const ORPHAN_SWEEP_MIN_OBJECT_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const ORPHAN_SWEEP_SOFT_DELETE_GRACE_MS = 30 * 24 * 60 * 60 * 1000;
export const ORPHAN_SWEEP_MAX_DELETES_PER_RUN = 200;
const R2_LIST_PAGE_LIMIT = 1000;
const R2_LIST_MAX_PAGES_PER_PREFIX = 50;
const R2_DELETE_BATCH_SIZE = 100;
const LOGGED_SAMPLE_SIZE = 20;

type ReferenceRow = {
  a?: unknown;
  b?: unknown;
  deleted_at?: unknown;
};

/**
 * 업로드 URL(또는 그 URL이 들어간 리치텍스트·JSON 배열)을 담을 수 있는 모든 컬럼.
 * 새 테이블이 업로드 URL을 저장하게 되면 여기에 추가해야 한다 — 빠뜨리면 그 파일이 지워진다.
 */
const REFERENCE_QUERIES = [
  "SELECT cover_image_url AS a, description AS b, deleted_at FROM activities",
  "SELECT image_url AS a, deleted_at FROM activity_images",
  "SELECT cover_image_url AS a, description AS b, deleted_at FROM exhibitions",
  "SELECT image_url AS a, deleted_at FROM exhibition_images",
  "SELECT file_url AS a, link_url AS b, deleted_at FROM attachments",
  'SELECT image AS a, showcase_image_urls AS b, deleted_at FROM "user"',
  "SELECT promotion_image_urls AS a, content AS b FROM recruiting_plans",
  "SELECT link AS a, deleted_at FROM linktree_items",
  "SELECT object_key AS a FROM multipart_uploads",
] as const;

const MANAGED_KEY_PATTERN = new RegExp(
  `(?:${MANAGED_UPLOAD_RESOURCE_PATHS.join("|")})/[A-Za-z0-9_-]{1,120}/[a-z]+/[A-Za-z0-9._-]{1,160}`,
  "g",
);

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/** 문자열 안의 관리 형식 객체 키를 모두 찾는다(URL 인코딩된 형태 포함). */
export const extractManagedObjectKeys = (value: unknown): string[] => {
  if (typeof value !== "string" || value.length === 0) {
    return [];
  }

  const keys = new Set<string>();
  for (const candidate of [value, safeDecode(value)]) {
    for (const match of candidate.matchAll(MANAGED_KEY_PATTERN)) {
      keys.add(match[0]);
    }
  }
  return [...keys];
};

const isStillReferenced = (deletedAt: unknown, now: number): boolean => {
  if (deletedAt === null || deletedAt === undefined) {
    return true;
  }
  return toTimestampDate(deletedAt).getTime() > now - ORPHAN_SWEEP_SOFT_DELETE_GRACE_MS;
};

export const collectReferencedObjectKeys = async (
  database: Pick<D1Database, "prepare">,
  now: number,
): Promise<Set<string>> => {
  const referenced = new Set<string>();
  for (const query of REFERENCE_QUERIES) {
    const result = await database.prepare(query).all<ReferenceRow>();
    for (const row of result.results ?? []) {
      if (!isStillReferenced(row.deleted_at, now)) {
        continue;
      }
      for (const key of [
        ...extractManagedObjectKeys(row.a),
        ...extractManagedObjectKeys(row.b),
      ]) {
        referenced.add(key);
      }
    }
  }
  return referenced;
};

type SweepBucket = Pick<R2Bucket, "list" | "delete" | "get" | "put">;

/**
 * 접두사별 이어서 볼 목록 커서. 관리 접두사 밖에 두어 정리 대상이 되지 않는다.
 * 한 번에 볼 수 있는 페이지 수에 상한이 있어서, 커서를 남기지 않으면 객체가 많은 접두사는
 * 매일 처음 5만 개만 다시 보고 그 뒤의 고아는 영영 검사하지 못한다.
 */
export const ORPHAN_SWEEP_STATE_KEY = "_system/r2-orphan-sweep-state.json";

type SweepState = { cursors: Partial<Record<string, string>> };

const readSweepState = async (bucket: SweepBucket): Promise<SweepState> => {
  try {
    const object = await bucket.get(ORPHAN_SWEEP_STATE_KEY);
    const parsed = object ? ((await object.json()) as Partial<SweepState>) : null;
    return { cursors: parsed?.cursors ?? {} };
  } catch {
    return { cursors: {} };
  }
};

const saveSweepState = async (bucket: SweepBucket, state: SweepState): Promise<void> => {
  try {
    await bucket.put(ORPHAN_SWEEP_STATE_KEY, JSON.stringify(state), {
      httpMetadata: { contentType: "application/json" },
    });
  } catch (error) {
    // 저장에 실패하면 다음 실행이 처음부터 다시 볼 뿐이다.
    logger.warn({
      event: "r2.orphan_sweep.state_save_failed",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

const listPrefixPages = async (
  bucket: SweepBucket,
  prefix: string,
  startCursor: string | undefined,
): Promise<{ objects: { key: string; uploadedAt: number }[]; nextCursor?: string }> => {
  const objects: { key: string; uploadedAt: number }[] = [];
  let cursor = startCursor;
  for (let page = 0; page < R2_LIST_MAX_PAGES_PER_PREFIX; page += 1) {
    const listed = await bucket.list({
      prefix,
      limit: R2_LIST_PAGE_LIMIT,
      ...(cursor ? { cursor } : {}),
    });
    for (const object of listed.objects) {
      objects.push({ key: object.key, uploadedAt: object.uploaded.getTime() });
    }
    if (!listed.truncated) {
      // 끝까지 봤으면 다음 실행은 처음부터 다시 본다.
      return { objects };
    }
    cursor = listed.cursor;
  }
  return { objects, nextCursor: cursor };
};

const listManagedObjects = async (
  bucket: SweepBucket,
  state: SweepState,
): Promise<{ objects: { key: string; uploadedAt: number }[]; nextState: SweepState }> => {
  const objects: { key: string; uploadedAt: number }[] = [];
  const nextState: SweepState = { cursors: {} };
  for (const resourcePath of MANAGED_UPLOAD_RESOURCE_PATHS) {
    const prefix = `${resourcePath}/`;
    let listed: Awaited<ReturnType<typeof listPrefixPages>>;
    try {
      listed = await listPrefixPages(bucket, prefix, state.cursors[prefix]);
    } catch (error) {
      // 저장된 커서가 만료·무효이면 처음부터 다시 본다.
      if (!state.cursors[prefix]) {
        throw error;
      }
      listed = await listPrefixPages(bucket, prefix, undefined);
    }
    objects.push(...listed.objects);
    if (listed.nextCursor) {
      nextState.cursors[prefix] = listed.nextCursor;
    }
  }
  return { objects, nextState };
};

export type OrphanSweepResult = {
  mode: "dry-run" | "delete";
  scannedObjects: number;
  referencedKeys: number;
  orphanCount: number;
  deletedCount: number;
};

export const runR2OrphanSweep = async (input: {
  database: Pick<D1Database, "prepare">;
  bucket: SweepBucket;
  enabled: boolean;
  now?: number;
  maxDeletes?: number;
}): Promise<OrphanSweepResult> => {
  const now = input.now ?? Date.now();
  const maxDeletes = input.maxDeletes ?? ORPHAN_SWEEP_MAX_DELETES_PER_RUN;

  // 참조 수집이 실패하면 예외가 그대로 전파되어 아래 삭제 단계에 도달하지 않는다.
  const referenced = await collectReferencedObjectKeys(input.database, now);
  const { objects, nextState } = await listManagedObjects(
    input.bucket,
    await readSweepState(input.bucket),
  );

  const orphans = objects
    .filter(
      (object) =>
        parseManagedObjectKey(object.key) !== null &&
        object.uploadedAt < now - ORPHAN_SWEEP_MIN_OBJECT_AGE_MS &&
        !referenced.has(object.key),
    )
    .map((object) => object.key);

  const toDelete = input.enabled ? orphans.slice(0, maxDeletes) : [];
  for (let index = 0; index < toDelete.length; index += R2_DELETE_BATCH_SIZE) {
    await input.bucket.delete(toDelete.slice(index, index + R2_DELETE_BATCH_SIZE));
  }

  await saveSweepState(input.bucket, nextState);

  const result: OrphanSweepResult = {
    mode: input.enabled ? "delete" : "dry-run",
    scannedObjects: objects.length,
    referencedKeys: referenced.size,
    orphanCount: orphans.length,
    deletedCount: toDelete.length,
  };
  logger.info({
    event: "r2.orphan_sweep.completed",
    ...result,
    sampleKeys: (input.enabled ? toDelete : orphans).slice(0, LOGGED_SAMPLE_SIZE),
  });
  return result;
};
