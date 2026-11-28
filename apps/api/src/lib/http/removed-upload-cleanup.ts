import type { Context } from "hono";
import type HonoAppType from "../../types/honoAppType";
import type { AppDependencies } from "../services/dependencies";
import { collectRemovedObjectKeys } from "../storage/removed-upload-cleanup";
import { runNonCriticalTask } from "./non-critical";

/**
 * 변경 전 값(`before`)에만 있던 업로드 파일을 응답 뒤에 R2에서 지운다.
 * 삭제는 `before`만 넘기고, 수정은 변경 후 값(`after`)도 넘겨 그대로 남은 파일을 빼면
 * 바뀐 것이 없을 때 참조 조회 자체를 건너뛴다. 실패해도 요청은 성공으로 끝난다 —
 * 놓친 파일은 매일 도는 고아 정리(`orphan-sweep.ts`)가 지운다.
 */
export const scheduleRemovedUploadCleanup = async (
  c: Context<HonoAppType>,
  dependencies: Pick<AppDependencies, "deleteUnreferencedUploads">,
  before: readonly unknown[],
  after: readonly unknown[] = [],
): Promise<void> => {
  const keys = collectRemovedObjectKeys(before, after);
  if (keys.length === 0) {
    return;
  }

  await runNonCriticalTask(
    c,
    "removed-upload-cleanup",
    () => dependencies.deleteUnreferencedUploads(c, keys),
    { fallback: "await" },
  );
};

/**
 * 지워질 파일을 알아내기 위한 변경 전 조회. 정리는 부가 작업이므로 이 조회가 실패해도
 * 본 요청(삭제·수정)은 그대로 진행한다 — 그때 놓친 파일은 고아 정리가 지운다.
 */
export const readBeforeUploadCleanup = async <T>(
  read: () => Promise<T | null>,
): Promise<T | null> => {
  try {
    return await read();
  } catch {
    return null;
  }
};
