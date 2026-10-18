import type { ReactNode } from "react";
import { buildMemberDisplayInitial } from "@/features/dashboard/members/display-name";

type MemberProfileHeaderProps = {
  displayName: string;
  image: string | null;
  subtitle: string;
  /** 이름 옆에 붙는 뱃지·수정 버튼 */
  children?: ReactNode;
};

/** 멤버 상세(기수 화면·설정 화면) 상단의 프로필 사진과 이름 */
export default function MemberProfileHeader({
  displayName,
  image,
  subtitle,
  children,
}: MemberProfileHeaderProps) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-4">
      <div className="h-16 w-16 overflow-hidden rounded-full border border-hairline bg-canvas-soft">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={`${displayName} 프로필 이미지`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-base font-semibold text-ink-muted">
            {buildMemberDisplayInitial(displayName)}
          </div>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-bold text-ink md:text-3xl">{displayName}</h1>
        <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>
      </div>

      {children}
    </div>
  );
}
