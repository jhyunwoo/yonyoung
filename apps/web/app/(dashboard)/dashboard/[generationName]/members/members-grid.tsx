import Link from "next/link";
import { listAdminGenerationMembers } from "@/features/dashboard/services/admin-read-service";
import AdminReadErrorNotice from "@/app/(dashboard)/_components/admin-read-error";
import {
  buildMemberDisplayInitial,
  buildMemberDisplayName,
} from "@/features/dashboard/members/display-name";
import { buildMemberRoleLabel } from "@/features/dashboard/members/member-role-label";

type MembersGridProps = {
  generationId: string;
  generationPath: string;
};

export default async function MembersGrid({
  generationId,
  generationPath,
}: MembersGridProps) {
  const result = await listAdminGenerationMembers(generationId);
  if (!result.ok) {
    return <AdminReadErrorNotice error={result.error} />;
  }

  const members = result.data;

  if (members.length === 0) {
    return (
      <p className="mt-6 rounded-lg border border-dashed border-hairline-strong bg-surface-sunken p-4 text-sm text-ink-muted">
        현재 기수에 등록된 멤버가 없습니다.
      </p>
    );
  }

  return (
    <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {members.map((member) => {
        const displayName = buildMemberDisplayName(member);
        const avatarFallback = buildMemberDisplayInitial(displayName);
        const roleLabel = buildMemberRoleLabel(member.role);

        return (
          // min-w-0: 카드 안 truncate 텍스트가 그리드 트랙을 넓히지 못하게 한다.
          <li key={member.id} className="min-w-0">
            <Link
              href={`${generationPath}/members/${encodeURIComponent(member.id)}`}
              className="block rounded-lg border border-hairline bg-surface-sunken p-4 transition hover:border-hairline-strong hover:bg-surface"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-hairline bg-canvas-soft">
                  {member.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.image}
                      alt={`${displayName} 프로필 이미지`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-ink-muted">
                      {avatarFallback}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
                  <p className="truncate text-xs text-ink-muted">
                    {member.department?.trim() || "학과 미등록"}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="rounded-full border border-hairline-strong bg-surface px-2 py-1 text-ink-muted">
                  {roleLabel}
                </span>
                <span className="text-ink-muted">상세 보기</span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
