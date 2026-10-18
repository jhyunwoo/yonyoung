import type {
  ApiPublicGenerationMember,
  ApiPublicGenerationWithMembers,
} from "@yonyoung/contracts";
import Image from "next/image";
import {
  buildMemberDisplayInitial,
  buildMemberDisplayName,
} from "@/features/dashboard/members/display-name";
import { buildMemberRoleLabel } from "@/features/dashboard/members/member-role-label";
import { shouldUseUnoptimizedImage } from "@/features/media/images/image-utils";
import {
  GenerationMembersController,
  type PhotographerDetail,
} from "./generation-members-controller";

type GenerationMembersGridProps = {
  generation: Pick<
    ApiPublicGenerationWithMembers,
    "id" | "name" | "sortOrder" | "members"
  >;
};

const UUID_LIKE_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const buildGenerationDisplayName = (
  generation: GenerationMembersGridProps["generation"],
): string => {
  const trimmedName = generation.name.trim();
  if (trimmedName.length === 0 || UUID_LIKE_PATTERN.test(trimmedName)) {
    return `${generation.sortOrder}기`;
  }
  return trimmedName;
};

const toPhotographerDetail = (member: ApiPublicGenerationMember): PhotographerDetail => {
  const displayName = buildMemberDisplayName(member);
  const personalLink = member.personalLink?.trim();

  return {
    id: member.id,
    image: member.image,
    displayName,
    initial: buildMemberDisplayInitial(displayName),
    roleLabel: buildMemberRoleLabel(member.role),
    personalLink: personalLink ? personalLink : null,
    collaborationAvailable: member.collaborationAvailable,
  };
};

/**
 * 기수 하나의 멤버 그리드 — 서버 컴포넌트다.
 *
 * 예전에는 파일 전체가 `"use client"` 라 기수마다 멤버 타일 전부가 하이드레이션됐다.
 * 타일에 필요한 것은 "눌렸다"는 신호뿐이므로 `PhotoGallery` 와 같은 방식으로 타일은
 * 서버 HTML 로 내보내고, 모달 상태와 클릭은 `GenerationMembersController` 하나가
 * `<ul>` 에서 이벤트 위임으로 받는다. 표시 이름·역할 같은 파생 값도 여기서 만든다.
 */
export default function GenerationMembersGrid({
  generation,
}: GenerationMembersGridProps) {
  const members = generation.members.map(toPhotographerDetail);

  return (
    <GenerationMembersController
      generationId={generation.id}
      generationDisplayName={buildGenerationDisplayName(generation)}
      members={members}
    >
      {members.map((member) => (
        <li key={member.id} data-testid={`about-photographers-member-${member.id}`}>
          <button
            type="button"
            className="flex w-full flex-col items-center gap-2 text-center"
            aria-label={`${member.displayName} 상세 정보 보기`}
            // 핸들러 대신 표시만 한다. 클릭은 컨트롤러가 위임으로 받는다
            data-member-id={member.id}
            data-testid={`about-photographers-member-button-${member.id}`}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-(--surface-strong-border) bg-(--surface-muted) p-0.5 shadow-[0_0_0_1px_rgba(15,16,24,0.08)] md:h-14 md:w-14"
              data-testid={`about-photographers-member-avatar-${member.id}`}
            >
              <div
                className="relative h-full w-full overflow-hidden rounded-full bg-(--surface-border)"
                // 사진이 없으면 이니셜만 그리므로 기다릴 이미지도 없다
                data-image-skeleton={member.image ? "" : undefined}
                suppressHydrationWarning
              >
                {member.image ? (
                  <Image
                    src={member.image}
                    alt={`${member.displayName} 프로필`}
                    fill
                    unoptimized={shouldUseUnoptimizedImage(member.image)}
                    sizes="(min-width: 768px) 56px, 48px"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-(--text-muted)">
                    {member.initial}
                  </div>
                )}
              </div>
            </div>
            <span
              className="text-xs font-semibold tracking-tight text-(--text-primary) md:text-sm"
              data-testid={`about-photographers-member-name-${member.id}`}
            >
              {member.displayName}
            </span>
          </button>
        </li>
      ))}
    </GenerationMembersController>
  );
}
