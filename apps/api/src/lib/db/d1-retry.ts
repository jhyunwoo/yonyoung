// 일시적 장애로 볼 수 있는 메시지만 재시도한다. 예전에는 `D1_ERROR` 접두사만 보고
// 모든 D1 오류를 재시도해, 제약 조건 위반·트리거 중단처럼 다시 해도 똑같이 실패하는
// 오류까지 지연을 늘렸다.
const RETRYABLE_D1_PATTERNS = [
  /database is locked/i,
  /temporarily unavailable/i,
  /too many requests/i,
  /timeout/i,
  /network error/i,
  /network connection lost/i,
  /connection (?:was )?reset/i,
  /storage busy/i,
  /overloaded/i,
  /internal error.*try again/i,
] as const;

// 재시도해도 결과가 같은 오류. 특히 첫 시도가 실제로는 커밋된 뒤 응답만 끊긴 경우
// 재시도가 PK 충돌로 바뀌므로, 제약·트리거 오류는 절대 재시도하지 않는다.
const NON_RETRYABLE_D1_PATTERNS = [
  /constraint/i,
  /sqlite_abort/i,
  /no such (?:table|column)/i,
  /syntax error/i,
  /too many sql variables/i,
] as const;

export type D1WriteRetryOptions = {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterRatio?: number;
  sleep?: (ms: number) => Promise<void>;
  isRetryableError?: (error: unknown) => boolean;
  onRetry?: (input: {
    attempt: number;
    delayMs: number;
    error: unknown;
  }) => void;
};

const defaultSleep = async (ms: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
};

const normalizeNumber = (value: number, fallback: number): number =>
  Number.isFinite(value) && value >= 0 ? value : fallback;

const computeBackoffDelay = (
  attempt: number,
  input: {
    baseDelayMs: number;
    maxDelayMs: number;
    jitterRatio: number;
  },
): number => {
  const exponential = Math.min(
    input.maxDelayMs,
    input.baseDelayMs * 2 ** attempt,
  );
  const jitter = exponential * input.jitterRatio * Math.random();
  return Math.round(exponential + jitter);
};

export const isRetryableD1WriteError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  if (NON_RETRYABLE_D1_PATTERNS.some((pattern) => pattern.test(error.message))) {
    return false;
  }

  return RETRYABLE_D1_PATTERNS.some((pattern) => pattern.test(error.message));
};

export const runWithD1WriteRetry = async <T>(
  operation: () => Promise<T>,
  options?: D1WriteRetryOptions,
): Promise<T> => {
  const maxRetries = normalizeNumber(options?.maxRetries ?? 2, 2);
  const baseDelayMs = normalizeNumber(options?.baseDelayMs ?? 25, 25);
  const maxDelayMs = normalizeNumber(options?.maxDelayMs ?? 500, 500);
  const jitterRatio = Math.min(
    1,
    Math.max(0, normalizeNumber(options?.jitterRatio ?? 0.2, 0.2)),
  );
  const sleep = options?.sleep ?? defaultSleep;
  const isRetryable = options?.isRetryableError ?? isRetryableD1WriteError;

  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= maxRetries || !isRetryable(error)) {
        throw error;
      }

      const delayMs = computeBackoffDelay(attempt, {
        baseDelayMs,
        maxDelayMs,
        jitterRatio,
      });
      options?.onRetry?.({
        attempt: attempt + 1,
        delayMs,
        error,
      });
      await sleep(delayMs);
      attempt += 1;
    }
  }
};
