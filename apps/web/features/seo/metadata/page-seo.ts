import type { PageMetadataInput } from "@/features/seo/metadata/seo";

/**
 * 정적 공개 페이지의 SEO 문구를 한곳에 모은다.
 *
 * 같은 제목·설명을 `page.tsx`의 `metadata`와 `opengraph-image.tsx`의 카드가 함께 쓴다.
 * 두 곳에 따로 적어 두면 한쪽만 고쳐져 링크 미리보기와 검색 결과가 어긋난다.
 * 상세 페이지(`[id]`)는 게시물 데이터에서 문구를 만들므로 여기에 없다.
 */
export const PAGE_SEO = {
  home: {
    title: "연영회 | 1966년 창립 연세대학교 중앙사진동아리",
    description:
      "1966년 창단한 연세대학교 중앙사진동아리 연영회입니다. 출사와 사진 프로젝트, 정기 전시, 리크루팅 소식을 한곳에서 만나보세요.",
    path: "/",
    keywords: [
      "연영회",
      "연세대학교",
      "중앙사진동아리",
      "사진동아리",
      "정기전",
      "아카이브",
    ],
  },
  about: {
    title: "연영회 소개 | 연세대학교 중앙사진동아리",
    description:
      "1966년부터 이어진 연세대학교 중앙사진동아리 연영회의 역사, 연간 활동, 기수 정보를 소개합니다.",
    path: "/about",
    keywords: ["연영회 소개", "연영회 역사", "연세대학교 동아리", "사진 동아리 활동"],
  },
  photographers: {
    title: "연영회 사진가·멤버 | 기수별 PHOTOGRAPHERS",
    description:
      "연세대학교 중앙사진동아리 연영회를 함께 만들어 온 사진가와 멤버를 기수별로 소개합니다. 각 멤버의 사진과 활동 정보를 확인하세요.",
    path: "/about/photographers",
    keywords: ["연영회", "Photographers", "연영회 멤버", "기수별 멤버"],
  },
  recruiting: {
    title: "연영회 리크루팅 | 연세대학교 사진동아리 모집",
    description:
      "연세대학교 중앙사진동아리 연영회의 올해 모집 일정과 지원 자격, 지원 절차를 안내합니다. 사진을 함께 배우고 기록할 신입 회원을 기다립니다.",
    path: "/about/recruiting",
    keywords: ["연영회 리크루팅", "연영회 모집", "동아리 모집", "RECRUITING"],
  },
  archive: {
    title: "아카이브 | 연영회",
    description: "연영회의 활동 기록과 전시 아카이브를 확인하세요.",
    path: "/archive",
  },
  archiveRecords: {
    title: "연영회 활동 기록 | 연세대 사진동아리 아카이브",
    description:
      "1966년부터 이어온 연세대학교 중앙사진동아리 연영회의 출사, 월간 프로젝트, 교류 활동을 사진과 기록으로 만나보세요.",
    path: "/archive/records",
    keywords: ["연영회 활동 기록", "사진 동아리 활동", "연세대 연영회 아카이브"],
  },
  archiveExhibitions: {
    title: "연영회 전시회 | 연세대 사진동아리 전시 아카이브",
    description:
      "연세대학교 중앙사진동아리 연영회의 정기 사진전, 신인 사진전, 보도 사진전을 일정과 장소, 작품 이미지로 확인하세요.",
    path: "/archive/exhibitions",
    keywords: ["연영회 전시", "연영회 전시 아카이브", "대학생 사진 전시"],
  },
  linktree: {
    title: "연영회 공식 링크 | SNS·문의·사진 커뮤니티",
    description:
      "연세대학교 중앙사진동아리 연영회의 공식 Instagram, 문의 채널, 사진 활동과 관련된 커뮤니티 링크를 한 곳에서 확인하세요.",
    path: "/linktree",
    keywords: ["연영회 링크", "연영회 SNS", "연영회 문의", "Linktree"],
  },
  donate: {
    title: "연영회 후원 안내 | 전시·사진 활동 후원",
    description:
      "연세대학교 중앙사진동아리 연영회의 전시 개최와 장비 유지, 사진 교육 활동을 후원하는 방법과 후원금 사용 내역을 안내합니다.",
    path: "/donate",
    keywords: ["연영회 후원", "DONATE US", "연영회 후원 안내", "후원금 사용 내역"],
  },
  pendingApproval: {
    title: "승인 대기 | 연영회",
    description: "연영회 계정 승인 대기 상태와 다음 절차를 확인하세요.",
    path: "/auth/pending-approval",
  },
} satisfies Record<string, PageMetadataInput>;

export type PageSeoKey = keyof typeof PAGE_SEO;
