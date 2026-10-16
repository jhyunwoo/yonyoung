import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

type DeltaProps = {
  current: number;
  previous: number;
  /** relative: 증감률(%), points: 비율 지표의 %p 차이 */
  kind?: "relative" | "points";
  /** 이탈률처럼 줄어야 좋은 지표 */
  lowerIsBetter?: boolean;
};

/**
 * 이전 기간 대비 증감. 이전 값이 0이면 비율이 의미가 없어 "+100%" 같은 숫자를 만들지 않고 문장으로 쓴다.
 * 화살표와 부호를 함께 써서 색만으로 증감을 전달하지 않는다.
 */
export default function Delta({
  current,
  previous,
  kind = "relative",
  lowerIsBetter = false,
}: DeltaProps) {
  if (kind === "relative" && previous === 0) {
    return <>이전 기간 기록 없음</>;
  }
  const change =
    kind === "points"
      ? (current - previous) * 100
      : ((current - previous) / previous) * 100;
  const isUp = change >= 0;
  const isGood = isUp !== lowerIsBetter;
  return (
    <span className="break-keep">
      <span
        className={`inline-flex items-center gap-0.5 whitespace-nowrap font-semibold tabular-nums ${
          isGood ? "text-success-text" : "text-danger-text"
        }`}
      >
        {isUp ? (
          <ArrowUpIcon className="h-3 w-3" aria-hidden="true" />
        ) : (
          <ArrowDownIcon className="h-3 w-3" aria-hidden="true" />
        )}
        {isUp ? "+" : "-"}
        {Math.abs(change).toFixed(1)}
        {kind === "points" ? "%p" : "%"}
      </span>{" "}
      이전 기간 대비
    </span>
  );
}
