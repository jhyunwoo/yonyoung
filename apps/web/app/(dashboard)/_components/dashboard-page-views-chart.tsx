"use client";

import { useMemo, useState } from "react";

type DailyTrendItem = {
  date: string;
  count: number;
};

type PageViewChartProps = {
  data: DailyTrendItem[];
  /** data와 같은 순번으로 짝지은 이전 기간 값. 있으면 점선으로 겹쳐 그린다. */
  comparison?: number[];
  /** 툴팁 숫자 뒤에 붙는 단위. */
  unit?: string;
};

type HoveredItem = {
  date: string;
  count: number;
  previous: number | undefined;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
};

const toPoints = (values: number[], maxCount: number): string => {
  const step = 1000 / (values.length - 1 || 1);
  return values
    .map((value, i) => `${i * step},${200 - (value / maxCount) * 200}`)
    .join(" ");
};

export default function PageViewChart({
  data,
  comparison,
  unit = "명",
}: PageViewChartProps) {
  const [hoveredItem, setHoveredItem] = useState<HoveredItem | null>(null);

  const maxCount = useMemo(() => {
    if (data.length === 0) return 0;
    return Math.max(...data.map((d) => d.count), ...(comparison ?? []), 1);
  }, [data, comparison]);

  const points = useMemo(
    () =>
      data.length === 0
        ? ""
        : toPoints(
            data.map((d) => d.count),
            maxCount,
          ),
    [data, maxCount],
  );

  const comparisonPoints = useMemo(
    () =>
      comparison === undefined || comparison.length === 0
        ? ""
        : toPoints(comparison, maxCount),
    [comparison, maxCount],
  );

  if (data.length === 0) return null;

  const width = 1000;
  const height = 200;
  const step = width / (data.length - 1 || 1);

  return (
    <div className="relative w-full h-auto aspect-[2.2/1] sm:aspect-[3.5/1] lg:aspect-[4.5/1]">
      <svg
        viewBox="0 0 1000 200"
        className="h-full w-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" className="text-primary-text/30" />
            <stop
              offset="100%"
              stopColor="currentColor"
              stopOpacity="0"
              className="text-primary-text/0"
            />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <line
          x1="0"
          y1="0"
          x2="1000"
          y2="0"
          className="stroke-hairline"
          strokeWidth="1"
        />
        <line
          x1="0"
          y1="100"
          x2="1000"
          y2="100"
          className="stroke-hairline"
          strokeWidth="1"
        />
        <line
          x1="0"
          y1="200"
          x2="1000"
          y2="200"
          className="stroke-hairline"
          strokeWidth="1"
        />

        {/* 이전 기간: 회색 점선이라 색을 구분하지 못해도 선 모양으로 구별된다. */}
        {comparisonPoints !== "" && (
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="6 5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            points={comparisonPoints}
            className="text-ink-muted"
          />
        )}

        {/* Area fill */}
        <polyline fill="url(#chartGradient)" points={`0,200 ${points} 1000,200`} />

        {/* Main line */}
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          className="text-primary-text"
        />

        {/* Dots (Hidden on small screens if too dense, scaled elegantly) */}
        {data.map((d, i) => {
          const x = i * step;
          const y = height - (d.count / maxCount) * height;
          return (
            <circle
              key={`dot-${d.date}`}
              cx={x}
              cy={y}
              r="2.5"
              className="fill-surface stroke-primary stroke-[1.5] sm:r-[3]"
            />
          );
        })}

        {/* Guide line and Highlight dot when hovered */}
        {hoveredItem && (
          <>
            <line
              x1={hoveredItem.x * 10}
              y1={0}
              x2={hoveredItem.x * 10}
              y2={200}
              className="stroke-hairline-strong"
              strokeDasharray="4 4"
              strokeWidth="1.5"
            />
            <circle
              cx={hoveredItem.x * 10}
              cy={hoveredItem.y * 2}
              r="6"
              className="fill-primary stroke-surface stroke-2 shadow-md"
            />
          </>
        )}

        {/* Hitboxes for easy hover interaction (covers vertical slice for each item) */}
        {data.map((d, i) => {
          const x = i * step;
          const y = height - (d.count / maxCount) * height;
          const rectWidth = step;
          const rectX = x - rectWidth / 2;

          return (
            <rect
              key={`hit-${d.date}`}
              x={rectX}
              y={0}
              width={rectWidth}
              height={200}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() =>
                setHoveredItem({
                  date: d.date,
                  count: d.count,
                  previous: comparison?.[i],
                  x: x / 10, // scale out of 100
                  y: y / 2, // scale out of 100
                })
              }
              onMouseLeave={() => setHoveredItem(null)}
              onTouchStart={() =>
                setHoveredItem({
                  date: d.date,
                  count: d.count,
                  previous: comparison?.[i],
                  x: x / 10,
                  y: y / 2,
                })
              }
            />
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoveredItem && (
        <div
          className="absolute z-10 max-w-32 pointer-events-none rounded-lg border border-hairline bg-surface/95 px-2.5 py-1.5 shadow-lg backdrop-blur-sm text-left transition-[left,top] duration-75 motion-reduce:transition-none"
          style={{
            // 좁은 화면에서 툴팁이 차트 밖으로 삐져나가 가로 스크롤을 만들지
            // 않도록 0 ~ (컨테이너 폭 - max-w-32) 범위로 고정한다.
            left: `clamp(0px, calc(${Math.max(6, Math.min(94, hoveredItem.x))}% - 60px), calc(100% - 8rem))`,
            // 이전 기간 줄이 붙으면 툴팁이 한 줄 길어지므로 그만큼 더 올린다.
            top: `calc(${hoveredItem.y}% - ${hoveredItem.previous !== undefined ? 72 : 56}px)`,
          }}
        >
          <p className="text-[9px] font-semibold text-ink-muted uppercase tracking-wider">
            {hoveredItem.date}
          </p>
          <p className="text-xs font-bold text-ink mt-0.5">
            {hoveredItem.count.toLocaleString()}
            {unit}
          </p>
          {hoveredItem.previous !== undefined && (
            <p className="text-[11px] text-ink-muted">
              이전 {hoveredItem.previous.toLocaleString()}
              {unit}
            </p>
          )}
        </div>
      )}

      {/* X-axis labels */}
      <div className="mt-2 flex justify-between px-1">
        <span className="text-[10px] text-ink-muted">{data[0]?.date}</span>
        <span className="text-[10px] text-ink-muted hidden sm:inline">
          {data[Math.floor(data.length / 2)]?.date}
        </span>
        <span className="text-[10px] text-ink-muted">{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}
