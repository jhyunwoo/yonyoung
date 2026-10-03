/**
 * 입력 순서를 유지하면서 최대 `limit`개씩만 동시에 비동기 작업을 실행한다.
 *
 * 하나라도 실패하면 새 작업을 더 시작하지 않고, 이미 시작한 작업이 끝난 뒤 첫 번째 오류로
 * reject 한다. 진행 중인 작업을 기다리는 이유는 업로드 예약 정산처럼 각 작업의 마무리가
 * 중간에 끊기면 안 되기 때문이다.
 */
export const mapWithConcurrency = async <TItem, TResult>(
  items: readonly TItem[],
  limit: number,
  task: (item: TItem, index: number) => Promise<TResult>,
): Promise<TResult[]> => {
  const results = new Array<TResult>(items.length);
  let nextIndex = 0;
  let failed = false;

  const runWorker = async (): Promise<void> => {
    while (!failed && nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = await task(items[index] as TItem, index);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  };

  const workerCount = Math.max(1, Math.min(Math.floor(limit), items.length));
  const settled = await Promise.allSettled(
    Array.from({ length: workerCount }, () => runWorker()),
  );
  const rejected = settled.find(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );
  if (rejected) {
    throw rejected.reason;
  }

  return results;
};
