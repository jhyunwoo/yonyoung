import type { BatchItem } from "drizzle-orm/batch";
import type createDB from "../../lib/db";

type Database = ReturnType<typeof createDB>;

/**
 * 여러 쓰기를 D1 batch 한 번으로 실행한다. D1 batch는 하나의 트랜잭션이라 중간 문장이
 * 실패하면 앞의 문장도 모두 롤백된다 — 부모/자식 soft delete, 이미지 순서 일괄 변경처럼
 * "일부만 반영되면 데이터가 어긋나는" 쓰기에 쓴다. 빈 목록이면 아무것도 하지 않는다.
 */
export const runAtomically = async (
  db: Database,
  queries: readonly BatchItem<"sqlite">[],
): Promise<void> => {
  const [first, ...rest] = queries;
  if (!first) {
    return;
  }

  await db.batch([first, ...rest]);
};
