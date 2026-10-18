const deterministicSampleValue = (input: string): number => {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash / 2 ** 32;
};

/**
 * `key` 를 해시해 `sampleRate` 비율만 통과시킨다.
 * 같은 key 는 항상 같은 결과라, 한 지표·한 오류의 보고가 중간에 끊기지 않는다.
 */
export const shouldSample = (sampleRate: number, key: string): boolean => {
  if (sampleRate >= 1) {
    return true;
  }

  if (sampleRate <= 0) {
    return false;
  }

  return deterministicSampleValue(key) < sampleRate;
};
