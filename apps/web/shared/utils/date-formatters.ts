const KOREA_TIME_ZONE = "Asia/Seoul";

const koreanDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: KOREA_TIME_ZONE,
});

const koreanNumericDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: KOREA_TIME_ZONE,
});

const koreanYearFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  timeZone: KOREA_TIME_ZONE,
});

export const formatKoreanDate = (timestampMs: number): string =>
  koreanDateFormatter.format(timestampMs);

export const formatKoreanDateCompact = (timestampMs: number): string =>
  koreanNumericDateFormatter.format(timestampMs).replaceAll(" ", "").replace(/\.$/, "");

export const formatKoreanDateRange = (
  startTimestampMs: number,
  endTimestampMs: number,
): string => {
  const start = formatKoreanDate(startTimestampMs);
  const end = formatKoreanDate(endTimestampMs);
  // 하루짜리 일정(한국 시각 기준 같은 날)은 "9월 30일 - 9월 30일" 대신 날짜 하나로 쓴다
  return start === end ? start : `${start} - ${end}`;
};

const formatKoreanYear = (timestampMs: number): string =>
  koreanYearFormatter.format(timestampMs);

export const formatKoreanYearRange = (
  startTimestampMs: number,
  endTimestampMs: number,
): string =>
  `${formatKoreanYear(startTimestampMs)} - ${formatKoreanYear(endTimestampMs)}`;
