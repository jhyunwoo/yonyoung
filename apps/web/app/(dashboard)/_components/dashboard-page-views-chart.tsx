"use client";

import { useMemo } from "react";

type DailyTrendItem = {
  date: string;
  count: number;
};

type PageViewChartProps = {
  data: DailyTrendItem[];
};

export default function PageViewChart({ data }: PageViewChartProps) {
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

  return (
    <div className="relative h-[200px] w-full">
      <svg
        viewBox="0 0 1000 200"
        className="h-full w-full overflow-visible"
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        <line
          x1="0"
          y1="0"
          x2="1000"
          y2="0"
          className="stroke-slate-100 dark:stroke-slate-800"
          strokeWidth="1"
        />
        <line
          x1="0"
          y1="100"
          x2="1000"
          y2="100"
          className="stroke-slate-100 dark:stroke-slate-800"
          strokeWidth="1"
        />
        <line
          x1="0"
          y1="200"
          x2="1000"
          y2="200"
          className="stroke-slate-200 dark:stroke-slate-700"
          strokeWidth="1"
        />

        {/* Area fill */}
        <polyline
          fill="url(#chartGradient)"
          points={`0,200 ${points} 1000,200`}
          className="opacity-20"
        />

        {/* Main line */}
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          className="text-slate-900 dark:text-slate-100"
        />

        {/* Dots */}
        {data.map((d, i) => {
          const width = 1000;
          const height = 200;
          const step = width / (data.length - 1 || 1);
          const x = i * step;
          const y = height - (d.count / maxCount) * height;
          return (
            <circle
              key={d.date}
              cx={x}
              cy={y}
              r="4"
              className="fill-white stroke-slate-900 stroke-2 dark:fill-slate-900 dark:stroke-slate-100"
            />
          );
        })}

        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="currentColor"
              className="text-slate-900 dark:text-slate-100"
            />
            <stop
              offset="100%"
              stopColor="currentColor"
              stopOpacity="0"
              className="text-slate-900 dark:text-slate-100"
            />
          </linearGradient>
        </defs>
      </svg>

      {/* X-axis labels (simplified) */}
      <div className="mt-2 flex justify-between px-1">
        <span className="text-[10px] text-slate-500 dark:text-slate-400">
          {data[0]?.date}
        </span>
        <span className="text-[10px] text-slate-500 dark:text-slate-400">
          {data[Math.floor(data.length / 2)]?.date}
        </span>
        <span className="text-[10px] text-slate-500 dark:text-slate-400">
          {data[data.length - 1]?.date}
        </span>
      </div>
    </div>
  );
}
