import { z } from "zod";

export const MCP_POLICY_RESOURCES = [
  "generation",
  "activity",
  "exhibition",
  "linktree",
  "user",
  "site_setting",
] as const;
export type McpPolicyResource = (typeof MCP_POLICY_RESOURCES)[number];

export const MCP_POLICY_ACTIONS = [
  "create",
  "read",
  "update",
  "delete",
] as const;
export type McpPolicyAction = (typeof MCP_POLICY_ACTIONS)[number];

export type McpPermission = {
  readonly resource: McpPolicyResource;
  readonly action: McpPolicyAction;
};

/**
 * 도구 노출 조건. 도구가 호출하는 라우트의 실제 가드와 같아야 한다.
 * API의 mcp-exposure 테스트가 라우트를 직접 호출해 어긋남을 잡는다.
 */
export type McpToolExposure =
  | { readonly kind: "verified" }
  | { readonly kind: "manager_like" }
  | { readonly kind: "leadership" }
  | { readonly kind: "permission"; readonly anyOf: readonly McpPermission[] };

export const MCP_TOOL_CATEGORIES = [
  "account",
  "generations",
  "activities",
  "exhibitions",
  "linktree",
  "attachments",
  "members",
  "settings",
  "stats",
] as const;
export type McpToolCategory = (typeof MCP_TOOL_CATEGORIES)[number];

export const MCP_TOOL_CATEGORY_LABELS: Record<McpToolCategory, string> = {
  account: "내 계정",
  generations: "기수",
  activities: "활동",
  exhibitions: "전시",
  linktree: "링크 모음",
  attachments: "첨부 자료",
  members: "멤버",
  settings: "사이트 설정",
  stats: "통계·기록",
};

export type McpToolCatalogEntry = {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly category: McpToolCategory;
  readonly exposure: McpToolExposure;
  readonly readOnly: boolean;
  readonly destructive: boolean;
  readonly examplePrompt: string;
};

const verified = { kind: "verified" } as const;
const managerLike = { kind: "manager_like" } as const;
const leadership = { kind: "leadership" } as const;
const can = (
  ...permissions: ReadonlyArray<readonly [McpPolicyResource, McpPolicyAction]>
): McpToolExposure => ({
  kind: "permission",
  anyOf: permissions.map(([resource, action]) => ({ resource, action })),
});

const DASHBOARD_UPLOAD_HINT =
  "사진은 MCP로 올릴 수 없습니다. data.coverImageUrl을 비우면 기본 이미지로 만들어지니, 결과의 dashboard_url을 사용자에게 알려 대시보드에서 커버와 사진을 올리도록 안내하세요.";

export const MCP_TOOL_CATALOG = [
  // 내 계정
  {
    name: "whoami",
    title: "내 정보 확인",
    description:
      "현재 연결된 연영 계정의 이름, 역할, 이 연결에서 쓸 수 있는 도구 목록을 돌려줍니다. 무엇을 할 수 있는지 모를 때 먼저 호출하세요.",
    category: "account",
    exposure: verified,
    readOnly: true,
    destructive: false,
    examplePrompt: "연영 MCP로 내가 뭘 할 수 있어?",
  },
  {
    name: "my_profile_update",
    title: "내 프로필 수정",
    description:
      "내 프로필의 성·이름, 단과대학, 학과, 학번, 연락처, 협업 가능 여부, 개인 링크를 수정합니다. data에 바꿀 필드만 넣습니다.",
    category: "account",
    exposure: verified,
    readOnly: false,
    destructive: false,
    examplePrompt: "내 학과를 시각디자인학과로 바꿔줘",
  },
  // 기수
  {
    name: "generation_list",
    title: "기수 목록",
    description:
      "모든 기수를 표시 순서대로 조회합니다. 다른 도구에 넘길 기수 ID를 찾을 때 씁니다.",
    category: "generations",
    exposure: can(["generation", "read"]),
    readOnly: true,
    destructive: false,
    examplePrompt: "기수 목록 보여줘",
  },
  {
    name: "generation_get",
    title: "기수 상세",
    description: "기수 하나의 이름, 순서, 활동 기간을 조회합니다.",
    category: "generations",
    exposure: can(["generation", "read"]),
    readOnly: true,
    destructive: false,
    examplePrompt: "25기 기간이 언제야?",
  },
  {
    name: "generation_members",
    title: "기수 멤버",
    description: "기수에 속한 멤버 목록을 조회합니다.",
    category: "generations",
    exposure: can(["generation", "read"]),
    readOnly: true,
    destructive: false,
    examplePrompt: "25기 멤버 알려줘",
  },
  {
    name: "generation_create",
    title: "기수 만들기",
    description:
      "새 기수를 만듭니다. data에 이름, 표시 순서, 시작일, 종료일을 넣습니다.",
    category: "generations",
    exposure: can(["generation", "create"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "26기를 2027년 3월 1일부터 2028년 2월 말까지로 만들어줘",
  },
  {
    name: "generation_update",
    title: "기수 수정",
    description:
      "기수 이름, 표시 순서, 기간을 수정합니다. data에 바꿀 필드만 넣습니다.",
    category: "generations",
    exposure: can(["generation", "update"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "26기 종료일을 2028년 3월 1일로 바꿔줘",
  },
  {
    name: "generation_reorder",
    title: "기수 순서 바꾸기",
    description: "두 기수의 표시 순서를 서로 바꿉니다.",
    category: "generations",
    exposure: can(["generation", "update"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "25기와 26기 순서를 바꿔줘",
  },
  {
    name: "generation_delete",
    title: "기수 삭제",
    description:
      "기수를 삭제합니다. 회장만 할 수 있습니다. 실행 전에 사용자에게 꼭 확인하세요.",
    category: "generations",
    exposure: can(["generation", "delete"]),
    readOnly: false,
    destructive: true,
    examplePrompt: "테스트로 만든 99기를 삭제해줘",
  },
  // 활동
  {
    name: "activity_list",
    title: "활동 목록",
    description:
      "활동 목록을 조회합니다. generationId를 넣으면 그 기수의 활동만 봅니다.",
    category: "activities",
    exposure: can(["activity", "read"]),
    readOnly: true,
    destructive: false,
    examplePrompt: "25기 활동 목록 보여줘",
  },
  {
    name: "activity_get",
    title: "활동 상세",
    description:
      "활동 하나의 내용과 세부 이미지 목록(이미지 ID, 순서 포함)을 조회합니다.",
    category: "activities",
    exposure: can(["activity", "read"]),
    readOnly: true,
    destructive: false,
    examplePrompt: "봄 출사 활동 내용 보여줘",
  },
  {
    name: "activity_create",
    title: "활동 만들기",
    description: `새 활동을 만듭니다. ${DASHBOARD_UPLOAD_HINT}`,
    category: "activities",
    exposure: can(["activity", "create"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "25기 봄 출사 활동을 만들어줘",
  },
  {
    name: "activity_update",
    title: "활동 수정",
    description:
      "활동 제목, 설명, 기간, 커버 이미지 URL을 수정합니다. data에 바꿀 필드만 넣습니다.",
    category: "activities",
    exposure: can(["activity", "update"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "봄 출사 활동 설명을 이렇게 바꿔줘",
  },
  {
    name: "activity_delete",
    title: "활동 삭제",
    description: "활동을 삭제합니다. 실행 전에 사용자에게 꼭 확인하세요.",
    category: "activities",
    exposure: can(["activity", "delete"]),
    readOnly: false,
    destructive: true,
    examplePrompt: "잘못 만든 활동을 지워줘",
  },
  {
    name: "activity_image_update",
    title: "활동 사진 순서 수정",
    description: "활동 세부 이미지 하나의 표시 순서를 바꿉니다.",
    category: "activities",
    exposure: can(["activity", "update"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "이 사진을 맨 앞으로 옮겨줘",
  },
  {
    name: "activity_images_update",
    title: "활동 사진 여러 장 수정",
    description:
      "활동 세부 이미지 여러 장의 표시 순서를 한 번에 바꿉니다. items에 imageId와 sortOrder를 넣습니다.",
    category: "activities",
    exposure: can(["activity", "update"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "사진 순서를 촬영 시간순으로 다시 정렬해줘",
  },
  {
    name: "activity_image_delete",
    title: "활동 사진 삭제",
    description:
      "활동 세부 이미지 하나를 삭제합니다. 실행 전에 사용자에게 꼭 확인하세요.",
    category: "activities",
    exposure: can(["activity", "delete"]),
    readOnly: false,
    destructive: true,
    examplePrompt: "흔들린 사진 한 장을 지워줘",
  },
  // 전시
  {
    name: "exhibition_list",
    title: "전시 목록",
    description:
      "전시 목록을 조회합니다. generationId를 넣으면 그 기수의 전시만 봅니다.",
    category: "exhibitions",
    exposure: can(["exhibition", "read"]),
    readOnly: true,
    destructive: false,
    examplePrompt: "올해 전시 목록 보여줘",
  },
  {
    name: "exhibition_get",
    title: "전시 상세",
    description:
      "전시 하나의 내용과 세부 이미지 목록(이미지 ID, 순서 포함)을 조회합니다.",
    category: "exhibitions",
    exposure: can(["exhibition", "read"]),
    readOnly: true,
    destructive: false,
    examplePrompt: "가을 정기전 정보 보여줘",
  },
  {
    name: "exhibition_create",
    title: "전시 만들기",
    description: `새 전시를 만듭니다. ${DASHBOARD_UPLOAD_HINT}`,
    category: "exhibitions",
    exposure: can(["exhibition", "create"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "가을 정기전을 등록해줘",
  },
  {
    name: "exhibition_update",
    title: "전시 수정",
    description:
      "전시 제목, 장소, 기간, 설명, 커버 이미지 URL을 수정합니다. data에 바꿀 필드만 넣습니다.",
    category: "exhibitions",
    exposure: can(["exhibition", "update"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "정기전 장소를 학생회관 갤러리로 바꿔줘",
  },
  {
    name: "exhibition_delete",
    title: "전시 삭제",
    description:
      "전시를 삭제합니다. 회장만 할 수 있습니다. 실행 전에 사용자에게 꼭 확인하세요.",
    category: "exhibitions",
    exposure: can(["exhibition", "delete"]),
    readOnly: false,
    destructive: true,
    examplePrompt: "취소된 전시를 삭제해줘",
  },
  {
    name: "exhibition_image_update",
    title: "전시 사진 순서 수정",
    description: "전시 세부 이미지 하나의 표시 순서를 바꿉니다.",
    category: "exhibitions",
    exposure: can(["exhibition", "update"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "이 작품을 두 번째로 옮겨줘",
  },
  {
    name: "exhibition_images_update",
    title: "전시 사진 여러 장 수정",
    description:
      "전시 세부 이미지 여러 장의 표시 순서를 한 번에 바꿉니다. items에 imageId와 sortOrder를 넣습니다.",
    category: "exhibitions",
    exposure: can(["exhibition", "update"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "작가 이름순으로 사진을 정렬해줘",
  },
  {
    name: "exhibition_image_delete",
    title: "전시 사진 삭제",
    description:
      "전시 세부 이미지 하나를 삭제합니다. 실행 전에 사용자에게 꼭 확인하세요.",
    category: "exhibitions",
    exposure: can(["exhibition", "update"]),
    readOnly: false,
    destructive: true,
    examplePrompt: "중복으로 올라간 사진을 지워줘",
  },
  // 링크 모음
  {
    name: "linktree_list",
    title: "링크 모음 목록",
    description: "링크 모음과 그 안의 링크들을 조회합니다.",
    category: "linktree",
    exposure: can(["linktree", "read"]),
    readOnly: true,
    destructive: false,
    examplePrompt: "링크 모음 보여줘",
  },
  {
    name: "linktree_get",
    title: "링크 모음 상세",
    description: "링크 모음 하나와 그 안의 링크들을 조회합니다.",
    category: "linktree",
    exposure: can(["linktree", "read"]),
    readOnly: true,
    destructive: false,
    examplePrompt: "모집 링크 모음에 뭐가 있어?",
  },
  {
    name: "linktree_create",
    title: "링크 모음 만들기",
    description: "새 링크 모음을 만듭니다.",
    category: "linktree",
    exposure: can(["linktree", "create"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "'2027 모집' 링크 모음을 만들어줘",
  },
  {
    name: "linktree_update",
    title: "링크 모음 이름 변경",
    description: "링크 모음 이름을 바꿉니다.",
    category: "linktree",
    exposure: can(["linktree", "update"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "링크 모음 이름을 '공식 링크'로 바꿔줘",
  },
  {
    name: "linktree_delete",
    title: "링크 모음 삭제",
    description:
      "링크 모음과 그 안의 링크를 모두 삭제합니다. 실행 전에 사용자에게 꼭 확인하세요.",
    category: "linktree",
    exposure: can(["linktree", "delete"]),
    readOnly: false,
    destructive: true,
    examplePrompt: "지난 모집 링크 모음을 지워줘",
  },
  {
    name: "linktree_item_add",
    title: "링크 추가",
    description: "링크 모음에 링크를 추가합니다. data에 이름과 URL을 넣습니다.",
    category: "linktree",
    exposure: can(["linktree", "update"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "공식 링크에 인스타그램 주소를 추가해줘",
  },
  {
    name: "linktree_item_update",
    title: "링크 수정",
    description: "링크 이름이나 URL을 바꿉니다.",
    category: "linktree",
    exposure: can(["linktree", "update"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "오픈채팅 링크를 새 주소로 바꿔줘",
  },
  {
    name: "linktree_item_delete",
    title: "링크 삭제",
    description: "링크 하나를 삭제합니다. 실행 전에 사용자에게 꼭 확인하세요.",
    category: "linktree",
    exposure: can(["linktree", "delete"]),
    readOnly: false,
    destructive: true,
    examplePrompt: "만료된 신청서 링크를 지워줘",
  },
  // 첨부 자료
  {
    name: "attachment_list",
    title: "첨부 자료 목록",
    description:
      "활동 자료(scope=activity, resourceId=활동 ID) 또는 후원 회계 자료(scope=site_donate)를 조회합니다.",
    category: "attachments",
    exposure: can(["activity", "read"], ["site_setting", "read"]),
    readOnly: true,
    destructive: false,
    examplePrompt: "후원 회계 자료 목록 보여줘",
  },
  {
    name: "attachment_create",
    title: "첨부 자료 등록",
    description:
      "외부 링크(data.linkUrl)를 자료로 등록합니다. 문서 파일은 MCP로 올릴 수 없으니 대시보드에서 올리도록 안내하세요. 후원 회계 자료(site_donate)는 회장단만 등록할 수 있습니다.",
    category: "attachments",
    exposure: can(
      ["activity", "create"],
      ["activity", "update"],
      ["site_setting", "create"],
      ["site_setting", "update"],
    ),
    readOnly: false,
    destructive: false,
    examplePrompt: "정산 시트 링크를 후원 회계 자료로 등록해줘",
  },
  {
    name: "attachment_update",
    title: "첨부 자료 수정",
    description: "자료 제목이나 표시 순서를 바꿉니다.",
    category: "attachments",
    exposure: can(
      ["activity", "create"],
      ["activity", "update"],
      ["site_setting", "create"],
      ["site_setting", "update"],
    ),
    readOnly: false,
    destructive: false,
    examplePrompt: "자료 제목을 '2026 상반기 정산'으로 바꿔줘",
  },
  {
    name: "attachment_delete",
    title: "첨부 자료 삭제",
    description: "자료 하나를 삭제합니다. 실행 전에 사용자에게 꼭 확인하세요.",
    category: "attachments",
    exposure: can(
      ["activity", "create"],
      ["activity", "update"],
      ["site_setting", "create"],
      ["site_setting", "update"],
    ),
    readOnly: false,
    destructive: true,
    examplePrompt: "잘못 올린 자료를 지워줘",
  },
  // 멤버
  {
    name: "member_list",
    title: "멤버 목록",
    description:
      "멤버 목록을 조회합니다. 회장단은 전체, 부장은 같은 기수 멤버, 부원은 본인만 보입니다.",
    category: "members",
    exposure: can(["user", "read"]),
    readOnly: true,
    destructive: false,
    examplePrompt: "승인 대기 중인 멤버 있어?",
  },
  {
    name: "member_get",
    title: "멤버 상세",
    description:
      "멤버 한 명의 프로필을 조회합니다. 볼 수 있는 범위는 member_list와 같습니다.",
    category: "members",
    exposure: can(["user", "read"]),
    readOnly: true,
    destructive: false,
    examplePrompt: "김연영 멤버 연락처 알려줘",
  },
  {
    name: "member_resource_history",
    title: "멤버 작업 이력",
    description: "멤버가 만들거나 수정한 콘텐츠 이력을 조회합니다.",
    category: "members",
    exposure: leadership,
    readOnly: true,
    destructive: false,
    examplePrompt: "이 멤버가 최근에 뭘 수정했어?",
  },
  {
    name: "member_update",
    title: "멤버 정보 수정",
    description:
      "멤버의 프로필, 역할, 기수를 수정합니다. 나보다 서열이 같거나 높은 사람은 수정할 수 없고, 마지막 회장은 강등할 수 없습니다. 역할을 바꾸기 전에 사용자에게 꼭 확인하세요.",
    category: "members",
    exposure: can(["user", "update"]),
    readOnly: false,
    destructive: true,
    examplePrompt: "이 멤버를 정회원으로 승인해줘",
  },
  {
    name: "member_bulk_role",
    title: "역할 일괄 변경",
    description:
      "여러 멤버의 역할을 한 번에 바꿉니다. 실행 전에 사용자에게 꼭 확인하세요.",
    category: "members",
    exposure: can(["user", "update"]),
    readOnly: false,
    destructive: true,
    examplePrompt: "25기 신입회원을 모두 정회원으로 바꿔줘",
  },
  {
    name: "member_delete",
    title: "멤버 삭제",
    description:
      "멤버를 삭제합니다. 나보다 서열이 낮은 멤버만 삭제할 수 있습니다. 실행 전에 사용자에게 꼭 확인하세요.",
    category: "members",
    exposure: can(["user", "delete"]),
    readOnly: false,
    destructive: true,
    examplePrompt: "탈퇴 요청한 멤버를 삭제해줘",
  },
  // 사이트 설정
  {
    name: "site_settings_get",
    title: "사이트 설정 조회",
    description:
      "푸터 연락처, 인스타그램, 후원 계좌 같은 사이트 기본 설정을 조회합니다.",
    category: "settings",
    exposure: can(["site_setting", "update"]),
    readOnly: true,
    destructive: false,
    examplePrompt: "지금 후원 계좌 정보 뭐로 돼 있어?",
  },
  {
    name: "site_settings_update",
    title: "사이트 설정 수정",
    description: "사이트 기본 설정을 수정합니다. data에 바꿀 필드만 넣습니다.",
    category: "settings",
    exposure: can(["site_setting", "update"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "푸터 이메일을 새 주소로 바꿔줘",
  },
  {
    name: "recruiting_plan_get",
    title: "모집 계획 조회",
    description:
      "올해 모집 계획(제목, 내용, 홍보 이미지, 모집 기간)을 조회합니다.",
    category: "settings",
    exposure: leadership,
    readOnly: true,
    destructive: false,
    examplePrompt: "올해 모집 기간 언제로 돼 있어?",
  },
  {
    name: "recruiting_plan_upsert",
    title: "모집 계획 저장",
    description:
      "올해 모집 계획을 저장합니다. data.promotionImageUrls에는 이미 있는 이미지 URL만 넣습니다. 새 홍보 이미지는 MCP로 올릴 수 없으니 대시보드에서 올리도록 안내하세요.",
    category: "settings",
    exposure: leadership,
    readOnly: false,
    destructive: false,
    examplePrompt: "2027 모집 기간을 3월 2일부터 15일까지로 저장해줘",
  },
  // 통계·기록
  {
    name: "dashboard_overview",
    title: "대시보드 요약",
    description:
      "멤버 수, 승인 대기 수, 기수별 활동·전시 수, 저장공간 사용량을 조회합니다.",
    category: "stats",
    exposure: managerLike,
    readOnly: true,
    destructive: false,
    examplePrompt: "저장공간 얼마나 남았어?",
  },
  {
    name: "page_view_stats",
    title: "방문 통계",
    description: "홈페이지 방문 통계(페이지별 합계)를 조회합니다.",
    category: "stats",
    exposure: verified,
    readOnly: true,
    destructive: false,
    examplePrompt: "어떤 페이지 방문이 제일 많아?",
  },
  {
    name: "page_view_dashboard",
    title: "방문 추이",
    description: "오늘·이번 주 방문 수와 일별 추이를 조회합니다.",
    category: "stats",
    exposure: verified,
    readOnly: true,
    destructive: false,
    examplePrompt: "이번 주 방문자 수 어때?",
  },
  {
    name: "page_view_analytics",
    title: "기간별 방문 분석",
    description:
      "지정한 기간의 방문 추이, 이전 기간 비교, 페이지 종류·인기 콘텐츠, 요일 패턴, 유입 경로와 기기를 조회합니다.",
    category: "stats",
    exposure: verified,
    readOnly: true,
    destructive: false,
    examplePrompt: "지난 6개월 방문 추이랑 유입 경로 보여줘",
  },
  {
    name: "audit_log_get",
    title: "변경 기록 조회",
    description:
      "콘텐츠 하나의 변경 기록(누가, 언제, 어떤 필드를)을 조회합니다. resourceType과 resourceId를 넣습니다.",
    category: "stats",
    exposure: managerLike,
    readOnly: true,
    destructive: false,
    examplePrompt: "이 활동 누가 마지막으로 수정했어?",
  },
] as const satisfies readonly McpToolCatalogEntry[];

export type McpToolName = (typeof MCP_TOOL_CATALOG)[number]["name"];

export const apiMcpToolSummarySchema = z.object({
  name: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.enum(MCP_TOOL_CATEGORIES),
  readOnly: z.boolean(),
  destructive: z.boolean(),
  examplePrompt: z.string(),
});
export type ApiMcpToolSummary = z.infer<typeof apiMcpToolSummarySchema>;

export const apiMcpOverviewSchema = z.object({
  serverUrl: z.url(),
  role: z.string(),
  tools: z.array(apiMcpToolSummarySchema),
});
export type ApiMcpOverview = z.infer<typeof apiMcpOverviewSchema>;

export const apiMcpConnectionSchema = z.object({
  clientId: z.string(),
  clientName: z.string().nullable(),
  clientUri: z.string().nullable(),
  scopes: z.array(z.string()),
  connectedAt: z.string(),
  updatedAt: z.string(),
});
export type ApiMcpConnection = z.infer<typeof apiMcpConnectionSchema>;

export const apiMcpConsentContextSchema = z.object({
  client: z.object({
    clientId: z.string(),
    name: z.string().nullable(),
    uri: z.string().nullable(),
  }),
  /** 허용하면 돌아갈 redirect_uri의 호스트. 앱 이름은 등록한 쪽이 정하므로 이 값으로 확인한다. */
  redirectHost: z.string().nullable(),
  scopes: z.array(z.string()),
  overview: apiMcpOverviewSchema,
});
export type ApiMcpConsentContext = z.infer<typeof apiMcpConsentContextSchema>;
