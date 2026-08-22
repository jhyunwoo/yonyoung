import "server-only";
import {
  listPublicActivities,
  listPublicExhibitions,
  safeList,
} from "@/features/public/services/public-read-service";

/**
 * 빌드 시점에 API가 닿지 않을 때 쓰는 자리표시자 id.
 *
 * cacheComponents는 `generateStaticParams`가 빈 배열을 돌려주면 빌드를 실패시킨다.
 * API 장애나 환경 변수 누락 때문에 배포 전체가 막히면 안 되므로 자리표시자 하나를
 * 돌려주고, 상세 페이지는 이 id에 대해 평소처럼 404를 렌더링한다
 * (조회가 실패하면 `notFound()`로 떨어지는 기존 경로를 그대로 탄다).
 */
export const PLACEHOLDER_PARAM_ID = "__placeholder__";

type IdParam = { id: string };

const toIdParams = (ids: string[]): IdParam[] =>
  ids.length > 0 ? ids.map((id) => ({ id })) : [{ id: PLACEHOLDER_PARAM_ID }];

/**
 * 활동 기록 상세(`/archive/records/[id]`)와 그 OG 이미지의 사전 렌더링 대상.
 *
 * 공개 활동은 수십 건 규모라 전부 빌드 시점에 굽는다. 목록에 없는 id로 들어와도
 * Partial Prerendering이 App Shell을 즉시 돌려주고 첫 방문 뒤 캐시에 올린다.
 */
export const generateActivityStaticParams = async (): Promise<IdParam[]> => {
  const activities = await safeList(listPublicActivities, []);
  return toIdParams(activities.map((activity) => activity.id));
};

/** 전시 상세(`/archive/exhibitions/[id]`)와 그 OG 이미지의 사전 렌더링 대상. */
export const generateExhibitionStaticParams = async (): Promise<IdParam[]> => {
  const exhibitions = await safeList(listPublicExhibitions, []);
  return toIdParams(exhibitions.map((exhibition) => exhibition.id));
};
