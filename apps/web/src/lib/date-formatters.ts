const koreanDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const koreanNumericDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const koreanYearFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
});

export const formatKoreanDate = (timestampMs: number): string =>
  koreanDateFormatter.format(timestampMs);

export const formatKoreanDateCompact = (timestampMs: number): string =>
  koreanNumericDateFormatter.format(timestampMs).replaceAll(" ", "").replace(/\.$/, "");

export const formatKoreanDateRange = (
  startTimestampMs: number,
  endTimestampMs: number,
): string => `${formatKoreanDate(startTimestampMs)} - ${formatKoreanDate(endTimestampMs)}`;

const formatKoreanYear = (timestampMs: number): string =>
  koreanYearFormatter.format(timestampMs);

export const formatKoreanYearRange = (
  startTimestampMs: number,
  endTimestampMs: number,
): string => `${formatKoreanYear(startTimestampMs)} - ${formatKoreanYear(endTimestampMs)}`;
