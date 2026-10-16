"use client";

import { XIcon } from "lucide-react";
import { Field } from "@/app/(dashboard)/_components/ui/field";
import { Select } from "@/app/(dashboard)/_components/ui/input";
import {
  AUDIENCE_LABEL,
  DEVICE_LABEL,
  PAGE_TYPE_LABEL,
  referrerLabel,
} from "@/features/dashboard/stats/insights-format";
import {
  DEFAULT_FILTERS,
  activeFilterCount,
  type StatsFilters,
} from "@/features/dashboard/stats/stats-range";

type StatsFilterControlsProps = {
  filters: StatsFilters;
  /** API가 돌려준 상위 유입 경로. 현재 선택값이 목록에 없어도 선택지로 보여 준다. */
  referrerOptions: readonly string[];
  onChange: (next: StatsFilters) => void;
};

const chipLabel = (key: keyof StatsFilters, value: string) => {
  switch (key) {
    case "audience":
      return AUDIENCE_LABEL[value as keyof typeof AUDIENCE_LABEL];
    case "device":
      return DEVICE_LABEL[value as keyof typeof DEVICE_LABEL];
    case "referrer":
      return `유입: ${referrerLabel(value)}`;
    case "landing":
      return `진입: ${PAGE_TYPE_LABEL[value as keyof typeof PAGE_TYPE_LABEL]}`;
  }
};

export default function StatsFilterControls({
  filters,
  referrerOptions,
  onChange,
}: StatsFilterControlsProps) {
  const referrers = [
    ...new Set([
      "direct",
      ...referrerOptions,
      ...(filters.referrer === "all" ? [] : [filters.referrer]),
    ]),
  ];
  const set = <K extends keyof StatsFilters>(key: K, value: StatsFilters[K]) =>
    onChange({ ...filters, [key]: value });
  const active = (Object.keys(filters) as Array<keyof StatsFilters>).filter(
    (key) => filters[key] !== "all",
  );

  return (
    <div className="flex flex-col gap-3" data-testid="stats-filters">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="방문자 구분">
          {(control) => (
            <Select
              className="min-h-11"
              {...control}
              data-testid="select-stats-audience"
              value={filters.audience}
              onChange={(event) =>
                set("audience", event.target.value as StatsFilters["audience"])
              }
            >
              {(["all", "external", "member"] as const).map((value) => (
                <option key={value} value={value}>
                  {AUDIENCE_LABEL[value]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="기기">
          {(control) => (
            <Select
              className="min-h-11"
              {...control}
              data-testid="select-stats-device"
              value={filters.device}
              onChange={(event) =>
                set("device", event.target.value as StatsFilters["device"])
              }
            >
              <option value="all">전체</option>
              {(["mobile", "tablet", "desktop"] as const).map((value) => (
                <option key={value} value={value}>
                  {DEVICE_LABEL[value]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="유입 경로">
          {(control) => (
            <Select
              className="min-h-11"
              {...control}
              data-testid="select-stats-referrer"
              value={filters.referrer}
              onChange={(event) => set("referrer", event.target.value)}
            >
              <option value="all">전체</option>
              {referrers.map((host) => (
                <option key={host} value={host}>
                  {referrerLabel(host)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="진입 페이지">
          {(control) => (
            <Select
              className="min-h-11"
              {...control}
              data-testid="select-stats-landing"
              value={filters.landing}
              onChange={(event) =>
                set("landing", event.target.value as StatsFilters["landing"])
              }
            >
              <option value="all">전체</option>
              {(["home", "activity", "exhibition", "notice"] as const).map((value) => (
                <option key={value} value={value}>
                  {PAGE_TYPE_LABEL[value]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      {active.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="켜진 필터">
          {active.map((key) => (
            <button
              key={key}
              type="button"
              data-testid={`chip-stats-${key}`}
              onClick={() => onChange({ ...filters, [key]: "all" })}
              className="inline-flex min-h-11 items-center gap-1 rounded-full border border-primary-hairline bg-primary-soft px-3 text-caption text-primary-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
            >
              {chipLabel(key, filters[key])}
              <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">필터 해제</span>
            </button>
          ))}
          {activeFilterCount(filters) > 1 && (
            <button
              type="button"
              data-testid="btn-stats-clear-filters"
              onClick={() => onChange(DEFAULT_FILTERS)}
              className="min-h-11 rounded-xs px-2 text-caption text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
            >
              필터 모두 해제
            </button>
          )}
        </div>
      )}
    </div>
  );
}
