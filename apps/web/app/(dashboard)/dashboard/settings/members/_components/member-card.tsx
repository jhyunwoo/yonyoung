"use client";

import Link from "next/link";
import type { ApiUser } from "@/shared/contracts/api-contracts";
import {
  buildMemberDisplayInitial,
  buildMemberDisplayName,
} from "@/features/dashboard/members/display-name";
import { buildMemberRoleLabel } from "@/features/dashboard/members/member-role-label";
import { readMemberGenerationNames } from "@/features/dashboard/members/member-directory";

type MemberCardProps = {
  user: ApiUser;
  generationNamesById: Record<string, string>;
  isSelected: boolean;
  isBulkUpdating: boolean;
  onToggle: (userId: string) => void;
};

export default function MemberCard({
  user,
  generationNamesById,
  isSelected,
  isBulkUpdating,
  onToggle,
}: MemberCardProps) {
  const displayName = buildMemberDisplayName(user);
  const avatarFallback = buildMemberDisplayInitial(displayName);
  const roleLabel = buildMemberRoleLabel(user.role);
  const generationNames = readMemberGenerationNames(user, generationNamesById);

  // 선택 상태는 파란 단색 채움이 아니라 소프트 틴트 + 파란 테두리로 표현한다.
  // 카드 안에 여러 줄의 보조 텍스트·뱃지가 들어가는데, 단색 채움 위에서는
  // 그 색들을 전부 뒤집어야 하고 그러다 대비가 깨진다(axe color-contrast).
  const cardClass = isSelected
    ? "border-primary bg-primary-soft text-ink"
    : "border-hairline bg-surface-sunken text-ink";
  const secondaryTextClass = "text-ink-muted";
  const neutralBadgeClass = isSelected
    ? "border-primary-hairline bg-surface text-ink-secondary"
    : "border-hairline-strong bg-surface text-ink-secondary";
  const emptyGenerationBadgeClass = isSelected
    ? "border-primary-hairline bg-surface text-ink-muted"
    : "border-hairline-strong bg-surface text-ink-muted";
  const linkTextClass = "text-ink hover:text-ink-secondary";

  return (
    // min-w-0: 카드 안 truncate 텍스트가 그리드 트랙을 넓히지 못하게 한다.
    <li key={user.id} className="min-w-0">
      <div
        data-testid={`settings-members-card-${user.id}`}
        className={`flex h-full flex-col rounded-lg border p-4 transition ${cardClass}`}
      >
        <div className="flex items-start gap-3">
          <Link
            href={`/dashboard/settings/members/${encodeURIComponent(user.id)}`}
            data-testid={`settings-members-open-${user.id}`}
            className={`flex min-w-0 flex-1 items-start gap-3 rounded-lg ${linkTextClass}`}
          >
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-hairline bg-canvas-soft">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={`${displayName} 프로필 이미지`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-ink-muted">
                  {avatarFallback}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className={`truncate text-xs ${secondaryTextClass}`}>
                {user.studentNumber?.trim() || "학번 미등록"}
              </p>
            </div>
          </Link>

          <button
            type="button"
            aria-pressed={isSelected}
            onClick={() => onToggle(user.id)}
            disabled={isBulkUpdating}
            data-testid={`settings-members-select-${user.id}`}
            className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${neutralBadgeClass}`}
          >
            {isSelected ? "선택됨" : "선택"}
          </button>
        </div>

        <Link
          href={`/dashboard/settings/members/${encodeURIComponent(user.id)}`}
          data-testid={`settings-members-detail-link-${user.id}`}
          className={`mt-3 block rounded-lg ${linkTextClass}`}
        >
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full border px-2 py-1 text-xs font-semibold ${neutralBadgeClass}`}
            >
              {roleLabel}
            </span>
            {generationNames.length > 0 ? (
              generationNames.map((generationName, index) => (
                <span
                  key={`${user.id}-${index}-${generationName}`}
                  className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700"
                >
                  {generationName}
                </span>
              ))
            ) : (
              <span
                className={`rounded-full border px-2 py-1 text-xs ${emptyGenerationBadgeClass}`}
              >
                기수 미등록
              </span>
            )}
          </div>

          <div className={`mt-3 space-y-1 text-xs ${secondaryTextClass}`}>
            <p className="truncate">대학: {user.college?.trim() || "미등록"}</p>
            <p className="truncate">학과: {user.department?.trim() || "미등록"}</p>
            <p className="truncate">전화번호: {user.phoneNumber?.trim() || "미등록"}</p>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <span className={`text-xs font-semibold ${secondaryTextClass}`}>
              {isSelected ? "권한 변경 대상에 포함됨" : "선택 후 일괄 작업 가능"}
            </span>
            <span className="text-xs font-semibold underline-offset-4 hover:underline">
              상세 보기
            </span>
          </div>
        </Link>
      </div>
    </li>
  );
}
