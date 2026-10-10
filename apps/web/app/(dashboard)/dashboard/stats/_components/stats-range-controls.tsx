"use client";

import { useState, type FormEvent } from "react";
import type { ApiPageViewGranularity } from "@yonyoung/contracts";
import { Button } from "@/app/(dashboard)/_components/ui/button";
import { Field } from "@/app/(dashboard)/_components/ui/field";
import { Input } from "@/app/(dashboard)/_components/ui/input";
import { SegmentedControl } from "@/app/(dashboard)/_components/ui/segmented-control";
import {
  STATS_PRESETS,
  presetQuery,
  validateCustomRange,
  type StatsPreset,
  type StatsQuery,
} from "@/features/dashboard/stats/stats-range";

type PeriodValue = StatsPreset | "custom";

const PERIOD_OPTIONS: ReadonlyArray<{ value: PeriodValue; label: string }> = [
  ...STATS_PRESETS.map(({ value, label }) => ({ value, label })),
  { value: "custom", label: "직접 지정" },
];

const GRANULARITY_OPTIONS: ReadonlyArray<{
  value: ApiPageViewGranularity;
  label: string;
}> = [
  { value: "day", label: "일" },
  { value: "week", label: "주" },
  { value: "month", label: "월" },
];

type StatsRangeControlsProps = {
  query: StatsQuery;
  today: string;
  /** API가 실제로 적용한 집계 단위. 쿼리에 없으면 기간 길이로 정해진다. */
  granularity: ApiPageViewGranularity;
  onChange: (next: StatsQuery) => void;
};

export default function StatsRangeControls({
  query,
  today,
  granularity,
  onChange,
}: StatsRangeControlsProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(query.preset === "custom");
  const [customFrom, setCustomFrom] = useState(query.from);
  const [customTo, setCustomTo] = useState(query.to);
  const [customError, setCustomError] = useState<string | null>(null);

  const handlePeriodChange = (next: PeriodValue) => {
    if (next === "custom") {
      setIsCustomOpen(true);
      return;
    }
    setIsCustomOpen(false);
    setCustomError(null);
    onChange(presetQuery(next, today));
  };

  const handleCustomSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validateCustomRange(customFrom, customTo, today);
    setCustomError(error);
    if (error === null) {
      onChange({ preset: "custom", from: customFrom, to: customTo, granularity: null });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          label="조회 기간"
          testIdPrefix="btn-stats-period"
          className="flex flex-wrap"
          value={isCustomOpen ? "custom" : query.preset}
          onChange={handlePeriodChange}
          options={PERIOD_OPTIONS}
        />
        <SegmentedControl
          label="집계 단위"
          testIdPrefix="btn-stats-granularity"
          value={granularity}
          onChange={(next) => onChange({ ...query, granularity: next })}
          options={GRANULARITY_OPTIONS}
        />
      </div>

      {isCustomOpen && (
        <form
          onSubmit={handleCustomSubmit}
          noValidate
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          data-testid="form-stats-custom-range"
        >
          <Field label="시작일" className="sm:w-44">
            {(control) => (
              <Input
                {...control}
                type="date"
                max={today}
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                data-testid="input-stats-from"
              />
            )}
          </Field>
          <Field label="종료일" className="sm:w-44">
            {(control) => (
              <Input
                {...control}
                type="date"
                max={today}
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                data-testid="input-stats-to"
              />
            )}
          </Field>
          <Button type="submit" variant="secondary" data-testid="btn-stats-custom-apply">
            기간 적용
          </Button>
          {customError !== null && (
            <p
              role="alert"
              className="text-caption text-danger-text sm:self-center"
              data-testid="stats-custom-range-error"
            >
              {customError}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
