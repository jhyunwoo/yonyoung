import { AppError } from "../../shared/errors/AppError";

type StoredDateRange = {
  startDate: Date | number;
  endDate: Date | number;
};

type DateRangePatch = {
  startDate?: number;
  endDate?: number;
};

const toMillis = (value: Date | number): number =>
  value instanceof Date ? value.getTime() : value;

/** 시작·종료 중 하나만 바꾸는 부분 수정인지 확인한다 (둘 다 오면 스키마가 이미 검증했다). */
export const isOneSidedDateRangePatch = (patch: DateRangePatch): boolean =>
  (patch.startDate === undefined) !== (patch.endDate === undefined);

/**
 * 부분 수정 후의 기간이 뒤집히지 않는지 저장된 값과 합쳐 확인한다.
 * 예) 종료일이 3월인 활동의 시작일만 4월로 바꾸는 요청을 400으로 막는다.
 */
export const assertDateRangeAfterPatch = (
  stored: StoredDateRange,
  patch: DateRangePatch,
  message: string,
): void => {
  const nextStart = patch.startDate ?? toMillis(stored.startDate);
  const nextEnd = patch.endDate ?? toMillis(stored.endDate);
  if (nextStart > nextEnd) {
    throw AppError.badRequest(message);
  }
};
