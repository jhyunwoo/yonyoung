import { logger } from "../../shared/logging/logger";
import {
  extractManagedObjectKeys,
  findUnreferencedObjectKeys,
} from "./orphan-sweep";
import { parseManagedObjectKey } from "./presign";

/**
 * 항목을 지우거나 사진을 교체·제거한 직후, 더는 쓰이지 않는 R2 객체를 바로 지운다.
 *
 * DB 삭제는 soft delete라 행이 남고, 예전에는 파일도 R2에 그대로 남아 주소를 아는 사람은
 * 계속 받을 수 있었다. 같은 파일을 다른 행이나 본문이 아직 쓰고 있을 수 있으므로, 지우기 전에
 * 살아 있는 행 전체에서 참조를 다시 확인한다(soft delete된 행은 참조로 보지 않는다).
 */

const collectKeys = (values: readonly unknown[]): Set<string> => {
  const keys = new Set<string>();
  for (const value of values.flat()) {
    for (const key of extractManagedObjectKeys(value)) {
      keys.add(key);
    }
  }
  return keys;
};

/** 변경 전 값에는 있고 변경 후 값에는 없는 관리 객체 키. */
export const collectRemovedObjectKeys = (
  before: readonly unknown[],
  after: readonly unknown[] = [],
): string[] => {
  const kept = collectKeys(after);
  return [...collectKeys(before)].filter((key) => !kept.has(key));
};

export const deleteUnreferencedObjects = async (input: {
  database: Pick<D1Database, "prepare">;
  bucket: Pick<R2Bucket, "delete">;
  keys: readonly string[];
}): Promise<string[]> => {
  const candidates = input.keys.filter(
    (key) => parseManagedObjectKey(key) !== null,
  );
  if (candidates.length === 0) {
    return [];
  }

  // 참조 조회가 실패하면 예외가 전파되어 삭제에 도달하지 않는다.
  const unreferenced = await findUnreferencedObjectKeys(
    input.database,
    candidates,
  );
  if (unreferenced.length > 0) {
    await input.bucket.delete(unreferenced);
  }
  logger.info({
    event: "r2.removed_upload_cleanup.completed",
    candidateCount: candidates.length,
    deletedCount: unreferenced.length,
  });
  return unreferenced;
};
