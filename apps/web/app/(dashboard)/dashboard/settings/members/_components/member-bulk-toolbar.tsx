"use client";

import {
  BULK_MEMBER_ROLE_OPTIONS,
  coerceBulkMemberRoleValue,
  type BulkMemberRoleValue,
} from "@/features/dashboard/members/member-role-options";
import type { MemberSelectionSummary } from "@/features/dashboard/members/member-selection";

type MemberBulkToolbarProps = {
  selection: MemberSelectionSummary;
  selectedRole: BulkMemberRoleValue;
  isBulkUpdating: boolean;
  canSelectVisible: boolean;
  onRoleChange: (role: BulkMemberRoleValue) => void;
  onSelectVisible: () => void;
  onClearSelection: () => void;
  onSubmit: () => void;
};

export default function MemberBulkToolbar({
  selection,
  selectedRole,
  isBulkUpdating,
  canSelectVisible,
  onRoleChange,
  onSelectVisible,
  onClearSelection,
  onSubmit,
}: MemberBulkToolbarProps) {
  const hasSelection = selection.totalSelectedCount > 0;

  return (
    <section className="mt-4 rounded-lg border border-hairline bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p
            className="text-sm font-semibold text-ink"
            data-testid="settings-members-selection-summary"
          >
            {hasSelection
              ? `선택된 멤버 ${selection.totalSelectedCount}명`
              : "멤버를 선택해 권한을 한 번에 변경할 수 있습니다."}
          </p>
          <p className="text-xs text-ink-muted">
            현재 목록에서 {selection.visibleSelectedCount}명이 선택되어 있습니다.
            {selection.hiddenSelectedCount > 0
              ? ` 필터에 가려진 선택 멤버 ${selection.hiddenSelectedCount}명도 함께 유지됩니다.`
              : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1">
            <span className="text-xs font-semibold text-ink-muted pr-4">변경할 권한</span>
            <select
              value={selectedRole}
              onChange={(event) =>
                onRoleChange(coerceBulkMemberRoleValue(event.target.value))
              }
              disabled={isBulkUpdating}
              data-testid="settings-members-bulk-role-select"
              className="min-w-40 rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              {BULK_MEMBER_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={onSelectVisible}
            disabled={!canSelectVisible || isBulkUpdating}
            data-testid="settings-members-select-visible-users"
            className="inline-flex rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-canvas-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            현재 목록 전체 선택
          </button>
          <button
            type="button"
            onClick={onClearSelection}
            disabled={!hasSelection || isBulkUpdating}
            data-testid="settings-members-clear-selected-users"
            className="inline-flex rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-canvas-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            선택 해제
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!hasSelection || isBulkUpdating}
            data-testid="settings-members-bulk-role-submit"
            className="inline-flex rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-on-primary transition hover:bg-primary-active disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBulkUpdating
              ? "변경 중..."
              : `권한 일괄 변경 (${selection.totalSelectedCount})`}
          </button>
        </div>
      </div>
    </section>
  );
}
