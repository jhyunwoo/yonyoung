// 버전 자리는 따지지 않는다. API보다 엄격하면 실제로 있는 게시물을 404로 돌려보낼 수 있다.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** API 경로의 `:id`로 넘길 수 있는 UUID 모양인지 확인한다. */
export const isUuid = (value: string): boolean => UUID_PATTERN.test(value);
