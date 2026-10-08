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
  "uploads",
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
  uploads: "파일 업로드",
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
  /** ChatGPT `openai/fileParams`로 선언할 최상위 인자 이름 */
  readonly fileArgs: readonly string[];
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

const CLAUDE_FILE_HINT =
  "Claude에서는 먼저 upload_prepare로 파일을 올리고 받은 upload_id를 넣습니다. ChatGPT에서는 채팅에 올린 파일이 자동으로 들어갑니다.";

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
    fileArgs: [],
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
    fileArgs: [],
  },
  {
    name: "my_profile_photo_set",
    title: "프로필 사진 변경",
    description: `채팅에 올린 이미지로 내 프로필 사진을 바꿉니다. ${CLAUDE_FILE_HINT} (purpose=profile_image)`,
    category: "account",
    exposure: verified,
    readOnly: false,
    destructive: false,
    examplePrompt: "이 사진을 내 프로필 사진으로 해줘",
    fileArgs: ["file"],
  },
  // 파일 업로드
  {
    name: "upload_prepare",
    title: "파일 업로드 준비",
    description:
      "Claude에서 채팅에 첨부한 파일을 연영에 올릴 때 먼저 호출합니다. 돌려받은 put_url로 코드 실행 환경에서 `curl -sS -T <파일 경로> <put_url>`을 실행하세요. 실패하면 사용자에게 browser_url을 열어 같은 파일을 올리도록 안내하고 upload_status로 완료를 확인합니다. 완료된 upload_id를 파일을 받는 도구에 넘깁니다. ChatGPT에서는 쓰지 않습니다.",
    category: "uploads",
    exposure: verified,
    readOnly: false,
    destructive: false,
    examplePrompt: "이 사진들을 25기 출사 활동에 올려줘",
    fileArgs: [],
  },
  {
    name: "upload_status",
    title: "업로드 상태 확인",
    description:
      "upload_prepare로 만든 업로드가 끝났는지 확인합니다. status가 completed면 upload_id를 쓸 수 있습니다.",
    category: "uploads",
    exposure: verified,
    readOnly: true,
    destructive: false,
    examplePrompt: "방금 올린 파일 업로드 끝났어?",
    fileArgs: [],
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
    fileArgs: [],
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
    fileArgs: [],
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
    fileArgs: [],
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
    fileArgs: [],
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
    fileArgs: [],
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
    fileArgs: [],
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
    fileArgs: [],
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
    fileArgs: [],
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
    fileArgs: [],
  },
  {
    name: "activity_create",
    title: "활동 만들기",
    description: `새 활동을 만듭니다. 커버 이미지는 data.coverImageUrl 대신 채팅에 올린 파일(cover_file 또는 cover_upload_id)로 지정할 수 있습니다. ${CLAUDE_FILE_HINT} (purpose=activity_cover)`,
    category: "activities",
    exposure: can(["activity", "create"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "이 사진을 커버로 25기 봄 출사 활동을 만들어줘",
    fileArgs: ["cover_file"],
  },
  {
    name: "activity_update",
    title: "활동 수정",
    description: `활동 제목, 설명, 기간, 커버 이미지를 수정합니다. data에 바꿀 필드만 넣습니다. 커버를 채팅 파일로 바꾸려면 cover_file 또는 cover_upload_id를 씁니다. ${CLAUDE_FILE_HINT} (purpose=activity_cover)`,
    category: "activities",
    exposure: can(["activity", "update"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "봄 출사 활동 설명을 이렇게 바꿔줘",
    fileArgs: ["cover_file"],
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
    fileArgs: [],
  },
  {
    name: "activity_images_add",
    title: "활동 사진 추가",
    description: `채팅에 올린 사진들을 활동 세부 이미지로 추가합니다. 한 번에 최대 500장입니다. ${CLAUDE_FILE_HINT} (purpose=activity_image)`,
    category: "activities",
    exposure: can(["activity", "update"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "이 사진들을 봄 출사 활동에 추가해줘",
    fileArgs: ["files"],
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
    fileArgs: [],
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
    fileArgs: [],
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
    fileArgs: [],
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
    fileArgs: [],
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
    fileArgs: [],
  },
  {
    name: "exhibition_create",
    title: "전시 만들기",
    description: `새 전시를 만듭니다. 커버 이미지는 data.coverImageUrl 대신 채팅에 올린 파일(cover_file 또는 cover_upload_id)로 지정할 수 있습니다. ${CLAUDE_FILE_HINT} (purpose=exhibition_cover)`,
    category: "exhibitions",
    exposure: can(["exhibition", "create"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "이 포스터로 가을 정기전을 등록해줘",
    fileArgs: ["cover_file"],
  },
  {
    name: "exhibition_update",
    title: "전시 수정",
    description: `전시 제목, 장소, 기간, 설명, 커버 이미지를 수정합니다. data에 바꿀 필드만 넣습니다. ${CLAUDE_FILE_HINT} (purpose=exhibition_cover)`,
    category: "exhibitions",
    exposure: can(["exhibition", "update"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "정기전 장소를 학생회관 갤러리로 바꿔줘",
    fileArgs: ["cover_file"],
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
    fileArgs: [],
  },
  {
    name: "exhibition_images_add",
    title: "전시 사진 추가",
    description: `채팅에 올린 사진들을 전시 세부 이미지로 추가합니다. 한 번에 최대 500장입니다. ${CLAUDE_FILE_HINT} (purpose=exhibition_image)`,
    category: "exhibitions",
    exposure: can(["exhibition", "update"]),
    readOnly: false,
    destructive: false,
    examplePrompt: "이 작품 사진들을 정기전에 추가해줘",
    fileArgs: ["files"],
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
    fileArgs: [],
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
    fileArgs: [],
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
    fileArgs: [],
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
    fileArgs: [],
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
    fileArgs: [],
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
    fileArgs: [],
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
    fileArgs: [],
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
    fileArgs: [],
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
    fileArgs: [],
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
    fileArgs: [],
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
    fileArgs: [],
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
    fileArgs: [],
  },
  {
    name: "attachment_create",
    title: "첨부 자료 등록",
    description: `문서 파일(pdf, xlsx, xls, docx, hwp, hwpx, zip) 또는 외부 링크(data.linkUrl)를 자료로 등록합니다. 파일과 링크 중 하나만 넣습니다. 후원 회계 자료(site_donate)는 회장단만 등록할 수 있습니다. ${CLAUDE_FILE_HINT} (purpose: activity 자료는 activity_file, 후원 자료는 site_file)`,
    category: "attachments",
    exposure: can(
      ["activity", "create"],
      ["activity", "update"],
      ["site_setting", "create"],
      ["site_setting", "update"],
    ),
    readOnly: false,
    destructive: false,
    examplePrompt: "이 정산 엑셀을 후원 회계 자료로 올려줘",
    fileArgs: ["file"],
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
    fileArgs: [],
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
    fileArgs: [],
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
    fileArgs: [],
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
    fileArgs: [],
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
    fileArgs: [],
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
    fileArgs: [],
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
    fileArgs: [],
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
    fileArgs: [],
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
    fileArgs: [],
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
    fileArgs: [],
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
    fileArgs: [],
  },
  {
    name: "recruiting_plan_upsert",
    title: "모집 계획 저장",
    description: `올해 모집 계획을 저장합니다. data.promotionImageUrls는 유지할 기존 이미지 URL 목록입니다. 새 홍보 이미지는 promotion_files 또는 promotion_upload_ids로 넣으면 뒤에 붙습니다. ${CLAUDE_FILE_HINT} (purpose=recruiting_image)`,
    category: "settings",
    exposure: leadership,
    readOnly: false,
    destructive: false,
    examplePrompt: "이 포스터로 2027 모집 공고를 올려줘",
    fileArgs: ["promotion_files"],
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
    fileArgs: [],
  },
  {
    name: "page_view_stats",
    title: "방문 통계",
    description: "홈페이지 방문 통계(페이지별 합계)를 조회합니다.",
    category: "stats",
    exposure: managerLike,
    readOnly: true,
    destructive: false,
    examplePrompt: "어떤 페이지 방문이 제일 많아?",
    fileArgs: [],
  },
  {
    name: "page_view_dashboard",
    title: "방문 추이",
    description: "오늘·이번 주 방문 수와 일별 추이를 조회합니다.",
    category: "stats",
    exposure: managerLike,
    readOnly: true,
    destructive: false,
    examplePrompt: "이번 주 방문자 수 어때?",
    fileArgs: [],
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
    fileArgs: [],
  },
] as const satisfies readonly McpToolCatalogEntry[];

export type McpToolName = (typeof MCP_TOOL_CATALOG)[number]["name"];

export const MCP_UPLOAD_PURPOSES = [
  "activity_cover",
  "activity_image",
  "activity_file",
  "exhibition_cover",
  "exhibition_image",
  "profile_image",
  "recruiting_image",
  "site_file",
] as const;
export type McpUploadPurpose = (typeof MCP_UPLOAD_PURPOSES)[number];

/** Workers 요청 본문 한도(100MB)에 맞춘 MCP 업로드 상한 */
export const MCP_UPLOAD_MAX_BYTES = 100_000_000;
export const MCP_UPLOAD_TTL_MS = 10 * 60 * 1000;

export const MCP_UPLOAD_STATUSES = [
  "pending",
  "receiving",
  "completed",
  "consumed",
  "failed",
] as const;
export type McpUploadStatus = (typeof MCP_UPLOAD_STATUSES)[number];

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

export const apiMcpUploadLookupSchema = z.object({
  uploadId: z.string(),
  fileName: z.string(),
  contentType: z.string(),
  declaredSize: z.number().int(),
  purpose: z.enum(MCP_UPLOAD_PURPOSES),
  status: z.enum(MCP_UPLOAD_STATUSES),
  expiresAt: z.string(),
  putUrl: z.url(),
});
export type ApiMcpUploadLookup = z.infer<typeof apiMcpUploadLookupSchema>;

export const apiMcpConsentContextSchema = z.object({
  client: z.object({
    clientId: z.string(),
    name: z.string().nullable(),
    uri: z.string().nullable(),
  }),
  scopes: z.array(z.string()),
  overview: apiMcpOverviewSchema,
});
export type ApiMcpConsentContext = z.infer<typeof apiMcpConsentContextSchema>;
