import type { ReactNode } from "react";
import type { ApiUser } from "@yonyoung/contracts";
import { readMemberGenerationNameText } from "@/features/dashboard/members/member-directory";
import { formatKoreanDate } from "@/shared/utils/date-formatters";
import LastUpdatedMeta from "@/app/(dashboard)/_components/last-updated-meta";

type MemberFullInfoListProps = {
  user: ApiUser;
  generationNamesById: Record<string, string>;
  /** 목록 맨 앞에 붙일 항목(설정 화면의 회원 구분) */
  leading?: ReactNode;
  /** 기수 화면은 학과를 위쪽 요약 카드에서 보여 주므로 여기서는 뺀다. */
  showsDepartment?: boolean;
};

export const MemberInfoItem = ({
  label,
  className,
  valueClassName = "mt-1 text-sm text-ink",
  children,
}: {
  label: string;
  className?: string;
  valueClassName?: string;
  children: ReactNode;
}) => (
  <div className={className}>
    <dt className="text-xs font-semibold text-ink-muted">{label}</dt>
    <dd className={valueClassName}>{children}</dd>
  </div>
);

/** 멤버 상세의 "전체 정보" 목록. 상세 열람 권한이 있을 때만 그린다. */
export default function MemberFullInfoList({
  user,
  generationNamesById,
  leading,
  showsDepartment = false,
}: MemberFullInfoListProps) {
  return (
    <div className="mt-6 rounded-lg border border-hairline p-4">
      <h2 className="text-sm font-semibold text-ink">전체 정보</h2>
      <dl className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {leading}
        <MemberInfoItem
          label="이메일"
          valueClassName="mt-1 text-sm text-ink wrap-anywhere"
        >
          {user.email}
        </MemberInfoItem>
        <MemberInfoItem label="성">{user.familyName ?? "-"}</MemberInfoItem>
        <MemberInfoItem label="이름">{user.givenName ?? "-"}</MemberInfoItem>
        <MemberInfoItem label="대학">{user.college ?? "-"}</MemberInfoItem>
        {showsDepartment ? (
          <MemberInfoItem label="학과">{user.department ?? "-"}</MemberInfoItem>
        ) : null}
        <MemberInfoItem label="학번">{user.studentNumber ?? "-"}</MemberInfoItem>
        <MemberInfoItem label="전화번호">{user.phoneNumber ?? "-"}</MemberInfoItem>
        <MemberInfoItem
          label="소속 기수"
          className="md:col-span-2 xl:col-span-3"
          valueClassName="mt-1 break-all text-sm text-ink"
        >
          {readMemberGenerationNameText(user, generationNamesById)}
        </MemberInfoItem>
        <MemberInfoItem label="생성일">{formatKoreanDate(user.createdAt)}</MemberInfoItem>
        <MemberInfoItem label="수정일">{formatKoreanDate(user.updatedAt)}</MemberInfoItem>
        <MemberInfoItem
          label="최근 수정"
          className="md:col-span-2 xl:col-span-3"
          valueClassName="mt-1"
        >
          <LastUpdatedMeta
            updatedAt={user.updatedAt}
            updatedBy={user.updatedBy}
            className="text-sm text-ink"
          />
        </MemberInfoItem>
      </dl>
    </div>
  );
}
