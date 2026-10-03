/**
 * Next 서버의 공개 API 읽기에 붙이는 표식.
 *
 * 공개 읽기 결과는 Next `"use cache"`(수일)에 저장되고 관리자 쓰기 때 `updateTag`로
 * 무효화된다. 그 직후의 재조회가 API 쪽 공개 캐시(엣지/KV, 최대 수 분)에서 수정 전
 * 응답을 받으면 옛 데이터가 다시 며칠 동안 구워진다. `fresh=1`이 붙은 요청은 API가
 * 캐시 계층을 건너뛰고 원본을 돌려준다(`apps/api/src/lib/http/public-cache.ts`).
 * Next 캐시가 비었을 때만 나가는 요청이라 API 부하는 거의 늘지 않는다.
 */
export const toFreshPublicReadPath = (path: string): string =>
  `${path}${path.includes("?") ? "&" : "?"}fresh=1`;
