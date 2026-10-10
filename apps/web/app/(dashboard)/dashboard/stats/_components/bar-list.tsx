import type { ReactNode } from "react";

type BarListItem = {
  key: string;
  label: ReactNode;
  value: number;
};

type BarListProps = {
  items: BarListItem[];
  /** 막대 길이 기준. 비중을 보여 줄 때는 합계, 순위를 보여 줄 때는 최댓값을 넘긴다. */
  scale: "total" | "max";
  /** 값 뒤에 붙는 단위. */
  unit: string;
  /** 소수 첫째 자리까지 보여 줄지 여부(요일 평균처럼 평균값일 때). */
  decimal?: boolean;
  emptyMessage: string;
};

/**
 * 가로 막대 목록. 숫자와 비율이 텍스트로 함께 나오므로 막대는 장식이고 aria-hidden 이다.
 * 막대 색은 페이지 전체의 데이터 색인 primary 하나만 쓴다(범주별로 색을 바꾸지 않는다).
 */
export default function BarList({
  items,
  scale,
  unit,
  decimal = false,
  emptyMessage,
}: BarListProps) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const max = Math.max(...items.map((item) => item.value), 0);
  const denominator = scale === "total" ? total : max;

  if (items.length === 0 || total === 0) {
    return <p className="text-caption text-ink-muted">{emptyMessage}</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => {
        const ratio = denominator === 0 ? 0 : item.value / denominator;
        return (
          <li key={item.key}>
            <div className="flex items-baseline justify-between gap-3 text-body-sm">
              <span className="min-w-0 truncate text-ink">{item.label}</span>
              <span className="shrink-0 text-ink-secondary tabular-nums">
                {decimal
                  ? item.value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })
                  : item.value.toLocaleString("ko-KR")}
                {unit}
                {scale === "total" && (
                  <span className="ml-1.5 text-caption text-ink-muted">
                    {Math.round((item.value / total) * 100)}%
                  </span>
                )}
              </span>
            </div>
            <div
              aria-hidden="true"
              className="mt-1.5 h-1.5 rounded-full bg-surface-sunken"
            >
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.max(ratio * 100, item.value > 0 ? 2 : 0)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
