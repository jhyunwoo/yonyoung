/**
 * `<input type="date">` 값(`YYYY-MM-DD`)과 타임스탬프(ms)를 오간다.
 * 둘 다 브라우저(사용자) 로컬 시간대의 자정을 기준으로 한다.
 */

const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const pad2 = (value: number): string => value.toString().padStart(2, "0");

export const formatTimestampToDateInput = (timestampMs: number): string => {
  const date = new Date(timestampMs);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

export const parseDateInputToTimestamp = (dateInputValue: string): number | null => {
  const trimmed = dateInputValue.trim();
  if (!DATE_INPUT_PATTERN.test(trimmed)) {
    return null;
  }

  const [yearPart, monthPart, dayPart] = trimmed.split("-");
  const year = Number.parseInt(yearPart ?? "", 10);
  const month = Number.parseInt(monthPart ?? "", 10);
  const day = Number.parseInt(dayPart ?? "", 10);
  const parsed = new Date(year, month - 1, day);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed.getTime();
};

/** `label`은 오류 문구 앞에 붙는 대상 이름이다(예: "활동", "전시"). */
export const validateDateRange = (
  input: { startDateInput: string; endDateInput: string },
  label: string,
): { startDate: number; endDate: number } | { errorMessage: string } => {
  const startDate = parseDateInputToTimestamp(input.startDateInput);
  const endDate = parseDateInputToTimestamp(input.endDateInput);

  if (startDate === null || endDate === null) {
    return {
      errorMessage: `${label} 시작일과 종료일을 올바르게 입력해 주세요.`,
    };
  }

  if (startDate > endDate) {
    return {
      errorMessage: `${label} 종료일은 시작일보다 빠를 수 없습니다.`,
    };
  }

  return { startDate, endDate };
};

/** 시작일이 늦은 것부터. 원본 배열은 바꾸지 않는다. */
export const sortByStartDateDesc = <T extends { startDate: number }>(
  list: readonly T[],
): T[] => {
  return [...list].sort((left, right) => right.startDate - left.startDate);
};
