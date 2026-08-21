"use client";

import type { MemberDirectoryFilterOptions } from "@/features/dashboard/members/member-directory";

export type MemberFilterState = {
  query: string;
  college: string;
  department: string;
  generationId: string;
};

type MemberFiltersProps = {
  filters: MemberFilterState;
  options: MemberDirectoryFilterOptions;
  totalCount: number;
  visibleCount: number;
  hasActiveFilters: boolean;
  onChange: (patch: Partial<MemberFilterState>) => void;
  onReset: () => void;
};

export default function MemberFilters({
  filters,
  options,
  totalCount,
  visibleCount,
  hasActiveFilters,
  onChange,
  onReset,
}: MemberFiltersProps) {
  return (
    <section className="rounded-lg border border-hairline bg-surface-sunken p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-ink-secondary">멤버 검색</span>
          <input
            value={filters.query}
            onChange={(event) => onChange({ query: event.target.value })}
            placeholder="이름, 학번, 전화번호로 검색"
            className="w-full rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm text-ink"
            data-testid="settings-members-search-input"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-ink-secondary">대학</span>
          <select
            value={filters.college}
            onChange={(event) => onChange({ college: event.target.value })}
            className="w-full rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm text-ink"
            data-testid="settings-members-college-filter"
          >
            <option value="">전체 대학</option>
            {options.colleges.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-ink-secondary">학과</span>
          <select
            value={filters.department}
            onChange={(event) => onChange({ department: event.target.value })}
            className="w-full rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm text-ink"
            data-testid="settings-members-department-filter"
          >
            <option value="">전체 학과</option>
            {options.departments.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold text-ink-secondary">속한 기수</span>
          <select
            value={filters.generationId}
            onChange={(event) => onChange({ generationId: event.target.value })}
            className="w-full rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm text-ink"
            data-testid="settings-members-generation-filter"
          >
            <option value="">전체 기수</option>
            {options.generations.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          총 {totalCount}명 중 {visibleCount}명을 보고 있습니다.
        </p>
        {hasActiveFilters ? (
          <button
            type="button"
            data-testid="settings-members-filters-reset"
            onClick={onReset}
            className="inline-flex rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-canvas-soft"
          >
            검색/필터 초기화
          </button>
        ) : null}
      </div>
    </section>
  );
}
