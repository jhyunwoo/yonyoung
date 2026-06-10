"use client";

import { useMemo, useState } from "react";

type DailyTrendItem = {
  date: string;
  count: number;
};

type PageViewChartProps = {
  data: DailyTrendItem[];
};

type HoveredItem = {
  date: string;
  count: number;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
};

export default function PageViewChart({ data }: PageViewChartProps) {
  const [hoveredItem, setHoveredItem] = useState<HoveredItem | null>(null);

  const maxCount = useMemo(() => {
    if (data.length === 0) return 0;
    return Math.max(...data.map((d) => d.count), 1);
  }, [data]);

  const points = useMemo(() => {
    if (data.length === 0) return "";
    const width = 1000;
    const height = 200;
    const step = width / (data.length - 1 || 1);

    return data
      .map((d, i) => {
        const x = i * step;
        const y = height - (d.count / maxCount) * height;
        return `${x},${y}`;
      })
      .join(" ");
  }, [data, maxCount]);

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
            <stop
              offset="0%"
              stopColor="currentColor"
              className="text-indigo-500/30 dark:text-indigo-400/40"
            />
            <stop
              offset="100%"
              stopColor="currentColor"
              stopOpacity="0"
              className="text-indigo-500/0 dark:text-indigo-400/0"
            />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <line
          x1="0"
          y1="0"
          x2="1000"
          y2="0"
          className="stroke-slate-100 dark:stroke-slate-800/60"
          strokeWidth="1"
        />
        <line
          x1="0"
          y1="100"
          x2="1000"
          y2="100"
          className="stroke-slate-100 dark:stroke-slate-800/60"
          strokeWidth="1"
        />
        <line
          x1="0"
          y1="200"
          x2="1000"
          y2="200"
          className="stroke-slate-200 dark:stroke-slate-700/60"
          strokeWidth="1"
        />

        {/* Area fill */}
        <polyline
          fill="url(#chartGradient)"
          points={`0,200 ${points} 1000,200`}
        />

        {/* Main line */}
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          className="text-indigo-600 dark:text-indigo-400"
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
              className="fill-white stroke-indigo-600 stroke-[1.5] dark:fill-slate-900 dark:stroke-indigo-400 sm:r-[3]"
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
              className="stroke-slate-300 dark:stroke-slate-600"
              strokeDasharray="4 4"
              strokeWidth="1.5"
            />
            <circle
              cx={hoveredItem.x * 10}
              cy={hoveredItem.y * 2}
              r="6"
              className="fill-indigo-600 stroke-white stroke-2 dark:fill-indigo-400 dark:stroke-slate-900 shadow-md"
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
                  x: x / 10, // scale out of 100
                  y: y / 2, // scale out of 100
                })
              }
              onMouseLeave={() => setHoveredItem(null)}
              onTouchStart={() =>
                setHoveredItem({
                  date: d.date,
                  count: d.count,
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
          className="absolute z-10 pointer-events-none rounded-lg border border-indigo-100 bg-white/95 px-2.5 py-1.5 shadow-lg dark:border-slate-800 dark:bg-slate-950/95 backdrop-blur-sm text-left transition-all duration-75"
          style={{
            left: `calc(${Math.max(6, Math.min(94, hoveredItem.x))}% - 60px)`,
            top: `calc(${hoveredItem.y}% - 56px)`,
          }}
        >
          <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {hoveredItem.date}
          </p>
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
            {hoveredItem.count.toLocaleString()}명
          </p>
        </div>
      )}

      {/* X-axis labels */}
      <div className="mt-2 flex justify-between px-1">
        <span className="text-[10px] text-slate-500 dark:text-slate-400">
          {data[0]?.date}
        </span>
        <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:inline">
          {data[Math.floor(data.length / 2)]?.date}
        </span>
        <span className="text-[10px] text-slate-500 dark:text-slate-400">
          {data[data.length - 1]?.date}
        </span>
      </div>
    </div>
  );
}
