import { z } from "@hono/zod-openapi";

const EXAMPLE_ID = "11111111-1111-4111-8111-111111111111";
const EXAMPLE_PARENT_ID = "22222222-2222-4222-8222-222222222222";
const EXAMPLE_IMAGE_ID = "33333333-3333-4333-8333-333333333333";
const EXAMPLE_ITEM_ID = "44444444-4444-4444-8444-444444444444";
const EXAMPLE_GENERATION_ID = "55555555-5555-4555-8555-555555555555";
const EXAMPLE_USER_ID = "OrYuGkpIFldOIkcrxLrwgzEegsLSJbrh";
const EXAMPLE_TIMESTAMP_MS = 1735689600000;
const EXAMPLE_TIMESTAMP_MS_END = 1738368000000;

const timestampField = (description: string, example = EXAMPLE_TIMESTAMP_MS) =>
  z
    .number()
    .int()
    .openapi({
      description: `${description} (Unix timestamp(ms), 클라이언트에서 연-월-일로 포맷 변환 권장)`,
      example,
    });

const urlField = (description: string, example: string) =>
  z.string().url().openapi({
    description,
    example,
  });

export const ApiErrorCodeSchema = z
  .enum([
    "BAD_REQUEST",
    "UNAUTHORIZED",
    "FORBIDDEN",
    "NOT_FOUND",
    "CONFLICT",
    "INTERNAL_ERROR",
  ])
  .openapi("ApiErrorCode");

export const ApiErrorSchema = z
  .object({
    code: ApiErrorCodeSchema.openapi({
      description: "서버가 분류한 에러 코드",
      example: "BAD_REQUEST",
    }),
    message: z.string().openapi({
      description: "클라이언트 디버깅을 위한 에러 메시지",
      example: "요청 본문 또는 파라미터가 올바르지 않습니다.",
    }),
  })
  .openapi("ApiError");

export const ApiErrorResponseSchema = z
  .object({
    error: ApiErrorSchema.openapi({
      description: "표준 에러 envelope",
    }),
  })
  .openapi("ApiErrorResponse");

export const ApiIdParamSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "조회/수정/삭제 대상 리소스 UUID",
      example: EXAMPLE_ID,
    }),
  })
  .openapi("ApiIdParam");

export const ApiUserIdParamSchema = z
  .object({
    id: z.string().min(1).openapi({
      description: "사용자 식별자 (better-auth user.id)",
      example: EXAMPLE_USER_ID,
    }),
  })
  .openapi("ApiUserIdParam");

export const ApiImageIdParamSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "상위 리소스 UUID (활동/전시)",
      example: EXAMPLE_PARENT_ID,
    }),
    imageId: z.string().uuid().openapi({
      description: "세부 이미지 리소스 UUID",
      example: EXAMPLE_IMAGE_ID,
    }),
  })
  .openapi("ApiImageIdParam");

export const ApiItemIdParamSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "상위 링크트리 UUID",
      example: EXAMPLE_PARENT_ID,
    }),
    itemId: z.string().uuid().openapi({
      description: "하위 링크 아이템 UUID",
      example: EXAMPLE_ITEM_ID,
    }),
  })
  .openapi("ApiItemIdParam");

export const ApiGenerationSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "기수 UUID",
      example: EXAMPLE_GENERATION_ID,
    }),
    name: z.string().openapi({
      description: "기수 이름",
      example: "10기",
    }),
    sortOrder: z.number().int().openapi({
      description: "기수 정렬 순서(작을수록 먼저 노출)",
      example: 10,
    }),
    startDate: timestampField("기수 시작일시", EXAMPLE_TIMESTAMP_MS),
    endDate: timestampField("기수 종료일시", EXAMPLE_TIMESTAMP_MS_END),
    createdAt: timestampField("생성 시각", EXAMPLE_TIMESTAMP_MS),
    updatedAt: timestampField("수정 시각", EXAMPLE_TIMESTAMP_MS),
  })
  .openapi("ApiGeneration");

export const ApiCreateGenerationSchema = z
  .object({
    name: z.string().min(1, "name은 필수입니다.").openapi({
      description: "생성할 기수 이름",
      example: "12기",
    }),
    sortOrder: z.number().int().nonnegative().openapi({
      description: "기수 정렬 순서(0 이상, UNIQUE)",
      example: 12,
    }),
    startDate: z.number().int().positive().openapi({
      description:
        "기수 시작일시 (Unix timestamp(ms), 클라이언트에서 연-월-일 포맷으로 변환)",
      example: EXAMPLE_TIMESTAMP_MS,
    }),
    endDate: z.number().int().positive().openapi({
      description:
        "기수 종료일시 (Unix timestamp(ms), 클라이언트에서 연-월-일 포맷으로 변환)",
      example: EXAMPLE_TIMESTAMP_MS_END,
    }),
  })
  .openapi("ApiCreateGenerationInput");

export const ApiUpdateGenerationSchema = ApiCreateGenerationSchema.partial().openapi(
  "ApiUpdateGenerationInput",
);

export const ApiActivityImageSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "활동 세부 이미지 UUID",
      example: EXAMPLE_IMAGE_ID,
    }),
    activityId: z.string().uuid().openapi({
      description: "상위 활동 UUID",
      example: EXAMPLE_PARENT_ID,
    }),
    imageUrl: urlField(
      "활동 세부 이미지 공개 URL (presigned 업로드 완료 후 저장되는 URL)",
      "https://cdn.yonyoung.example/activities/detail/detail-1.jpg",
    ),
    sortOrder: z.number().int().openapi({
      description: "세부 이미지 노출 순서",
      example: 0,
    }),
    createdAt: timestampField("세부 이미지 생성 시각", EXAMPLE_TIMESTAMP_MS),
    updatedAt: timestampField("세부 이미지 수정 시각", EXAMPLE_TIMESTAMP_MS),
  })
  .openapi("ApiActivityImage");

export const ApiActivitySchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "활동 UUID",
      example: EXAMPLE_PARENT_ID,
    }),
    title: z.string().openapi({
      description: "활동 제목",
      example: "겨울 정기 워크숍",
    }),
    description: z.string().openapi({
      description: "활동 상세 설명",
      example: "동아리 구성원 대상 촬영/편집 워크숍을 진행했습니다.",
    }),
    activityDate: timestampField("활동 일자/시각", EXAMPLE_TIMESTAMP_MS),
    coverImageUrl: urlField(
      "활동 대표 이미지 공개 URL (presigned 업로드 완료 후 저장)",
      "https://cdn.yonyoung.example/activities/cover/cover-1.jpg",
    ),
    generationId: z.string().uuid().openapi({
      description: "연결된 기수 UUID",
      example: EXAMPLE_GENERATION_ID,
    }),
    createdAt: timestampField("활동 생성 시각", EXAMPLE_TIMESTAMP_MS),
    updatedAt: timestampField("활동 수정 시각", EXAMPLE_TIMESTAMP_MS),
    detailImages: z.array(ApiActivityImageSchema).openapi({
      description: "활동 세부 이미지 목록",
    }),
  })
  .openapi("ApiActivity");

export const ApiCreateActivitySchema = z
  .object({
    title: z.string().min(1).openapi({
      description: "활동 제목",
      example: "봄 정기전 준비 모임",
    }),
    description: z.string().min(1).openapi({
      description: "활동 설명",
      example: "정기전 작품 선정 및 역할 분담을 진행했습니다.",
    }),
    activityDate: z.number().int().positive().openapi({
      description:
        "활동 일시 (Unix timestamp(ms), 화면에서는 연-월-일 포맷으로 변환해 사용)",
      example: EXAMPLE_TIMESTAMP_MS,
    }),
    coverImageUrl: urlField(
      "활동 대표 이미지 공개 URL",
      "https://cdn.yonyoung.example/activities/cover/new-cover.jpg",
    ),
    generationId: z.string().uuid("generationId 형식이 올바르지 않습니다.").openapi({
      description: "연결할 기수 UUID",
      example: EXAMPLE_GENERATION_ID,
    }),
  })
  .openapi("ApiCreateActivityInput");

export const ApiUpdateActivitySchema = ApiCreateActivitySchema.partial().openapi(
  "ApiUpdateActivityInput",
);

export const ApiCreateActivityImageSchema = z
  .object({
    imageUrl: urlField(
      "추가할 활동 세부 이미지 URL",
      "https://cdn.yonyoung.example/activities/detail/new-detail.jpg",
    ),
    sortOrder: z.number().int().nonnegative().default(0).openapi({
      description: "세부 이미지 표시 순서(기본값 0)",
      example: 0,
    }),
  })
  .openapi("ApiCreateActivityImageInput");

export const ApiUpdateActivityImageSchema = ApiCreateActivityImageSchema.partial().openapi(
  "ApiUpdateActivityImageInput",
);

export const ApiSupporterSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "후원사 UUID",
      example: EXAMPLE_ID,
    }),
    name: z.string().openapi({
      description: "후원사 이름",
      example: "Yonyoung Studio",
    }),
    link: urlField("후원사 링크 URL", "https://sponsor.example.com"),
    logoUrl: urlField(
      "후원사 로고 이미지 URL (presigned 업로드 완료 후 저장)",
      "https://cdn.yonyoung.example/supporters/logo/sponsor-logo.png",
    ),
    expiresAt: timestampField("후원 노출 만료 시각", EXAMPLE_TIMESTAMP_MS_END),
    createdAt: timestampField("후원사 생성 시각", EXAMPLE_TIMESTAMP_MS),
    updatedAt: timestampField("후원사 수정 시각", EXAMPLE_TIMESTAMP_MS),
  })
  .openapi("ApiSupporter");

export const ApiCreateSupporterSchema = z
  .object({
    name: z.string().min(1).openapi({
      description: "후원사 이름",
      example: "Yonyoung Studio",
    }),
    link: urlField("후원사 소개/외부 링크 URL", "https://sponsor.example.com"),
    logoUrl: urlField(
      "후원사 로고 이미지 공개 URL",
      "https://cdn.yonyoung.example/supporters/logo/new-logo.png",
    ),
    expiresAt: z.number().int().positive().openapi({
      description:
        "후원 만료 시각 (Unix timestamp(ms), 클라이언트에서 연-월-일로 표시)",
      example: EXAMPLE_TIMESTAMP_MS_END,
    }),
  })
  .openapi("ApiCreateSupporterInput");

export const ApiUpdateSupporterSchema = ApiCreateSupporterSchema.partial().openapi(
  "ApiUpdateSupporterInput",
);

export const ApiExhibitionImageSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "전시 세부 이미지 UUID",
      example: EXAMPLE_IMAGE_ID,
    }),
    exhibitionId: z.string().uuid().openapi({
      description: "상위 전시 UUID",
      example: EXAMPLE_PARENT_ID,
    }),
    imageUrl: urlField(
      "전시 세부 이미지 공개 URL",
      "https://cdn.yonyoung.example/exhibitions/detail/detail-1.jpg",
    ),
    sortOrder: z.number().int().openapi({
      description: "전시 세부 이미지 노출 순서",
      example: 0,
    }),
    createdAt: timestampField("세부 이미지 생성 시각", EXAMPLE_TIMESTAMP_MS),
    updatedAt: timestampField("세부 이미지 수정 시각", EXAMPLE_TIMESTAMP_MS),
  })
  .openapi("ApiExhibitionImage");

export const ApiExhibitionSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "전시 UUID",
      example: EXAMPLE_PARENT_ID,
    }),
    title: z.string().openapi({
      description: "전시 제목",
      example: "2026 정기 사진전",
    }),
    startDate: timestampField("전시 시작 시각", EXAMPLE_TIMESTAMP_MS),
    endDate: timestampField("전시 종료 시각", EXAMPLE_TIMESTAMP_MS_END),
    generationId: z.string().uuid().openapi({
      description: "연결된 기수 UUID",
      example: EXAMPLE_GENERATION_ID,
    }),
    place: z.string().openapi({
      description: "전시 장소",
      example: "서울시 성동구 아트홀 2관",
    }),
    coverImageUrl: urlField(
      "전시 대표 이미지 공개 URL",
      "https://cdn.yonyoung.example/exhibitions/cover/cover-1.jpg",
    ),
    description: z.string().openapi({
      description: "전시 소개 설명",
      example: "도시의 밤을 주제로 한 동아리 정기전입니다.",
    }),
    createdAt: timestampField("전시 생성 시각", EXAMPLE_TIMESTAMP_MS),
    updatedAt: timestampField("전시 수정 시각", EXAMPLE_TIMESTAMP_MS),
    detailImages: z.array(ApiExhibitionImageSchema).openapi({
      description: "전시 세부 이미지 목록",
    }),
  })
  .openapi("ApiExhibition");

export const ApiCreateExhibitionSchema = z
  .object({
    title: z.string().min(1).openapi({
      description: "전시 제목",
      example: "2026 정기 사진전",
    }),
    startDate: z.number().int().positive().openapi({
      description: "전시 시작 시각 (Unix timestamp(ms))",
      example: EXAMPLE_TIMESTAMP_MS,
    }),
    endDate: z.number().int().positive().openapi({
      description: "전시 종료 시각 (Unix timestamp(ms))",
      example: EXAMPLE_TIMESTAMP_MS_END,
    }),
    generationId: z.string().uuid("generationId 형식이 올바르지 않습니다.").openapi({
      description: "연결할 기수 UUID",
      example: EXAMPLE_GENERATION_ID,
    }),
    place: z.string().min(1).openapi({
      description: "전시 장소",
      example: "서울시 성동구 아트홀 2관",
    }),
    coverImageUrl: urlField(
      "전시 대표 이미지 공개 URL",
      "https://cdn.yonyoung.example/exhibitions/cover/new-cover.jpg",
    ),
    description: z.string().min(1).openapi({
      description: "전시 설명",
      example: "도시의 밤 풍경을 기록한 작품들을 전시합니다.",
    }),
  })
  .openapi("ApiCreateExhibitionInput");

export const ApiUpdateExhibitionSchema = ApiCreateExhibitionSchema.partial().openapi(
  "ApiUpdateExhibitionInput",
);

export const ApiCreateExhibitionImageSchema = z
  .object({
    imageUrl: urlField(
      "추가할 전시 세부 이미지 URL",
      "https://cdn.yonyoung.example/exhibitions/detail/new-detail.jpg",
    ),
    sortOrder: z.number().int().nonnegative().default(0).openapi({
      description: "세부 이미지 노출 순서(기본값 0)",
      example: 0,
    }),
  })
  .openapi("ApiCreateExhibitionImageInput");

export const ApiUpdateExhibitionImageSchema =
  ApiCreateExhibitionImageSchema.partial().openapi(
    "ApiUpdateExhibitionImageInput",
  );

export const ApiLinktreeItemSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "링크 아이템 UUID",
      example: EXAMPLE_ITEM_ID,
    }),
    linktreeId: z.string().uuid().openapi({
      description: "상위 링크트리 UUID",
      example: EXAMPLE_PARENT_ID,
    }),
    name: z.string().openapi({
      description: "링크 표시 이름",
      example: "인스타그램",
    }),
    link: urlField("실제 이동 URL", "https://instagram.com/yonyoung"),
  })
  .openapi("ApiLinktreeItem");

export const ApiLinktreeSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "링크트리 UUID",
      example: EXAMPLE_PARENT_ID,
    }),
    name: z.string().openapi({
      description: "링크트리 이름",
      example: "공식 채널",
    }),
    items: z.array(ApiLinktreeItemSchema).openapi({
      description: "하위 링크 아이템 목록",
    }),
  })
  .openapi("ApiLinktree");

export const ApiCreateLinktreeSchema = z
  .object({
    name: z.string().min(1).openapi({
      description: "생성할 링크트리 이름",
      example: "공식 채널",
    }),
  })
  .openapi("ApiCreateLinktreeInput");

export const ApiUpdateLinktreeSchema = ApiCreateLinktreeSchema.partial().openapi(
  "ApiUpdateLinktreeInput",
);

export const ApiCreateLinktreeItemSchema = z
  .object({
    name: z.string().min(1).openapi({
      description: "링크 아이템 이름",
      example: "YouTube",
    }),
    link: urlField(
      "링크 아이템 URL",
      "https://youtube.com/@yonyoung",
    ),
  })
  .openapi("ApiCreateLinktreeItemInput");

export const ApiUpdateLinktreeItemSchema = ApiCreateLinktreeItemSchema.partial().openapi(
  "ApiUpdateLinktreeItemInput",
);

export const ApiUserSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "사용자 UUID",
      example: EXAMPLE_USER_ID,
    }),
    name: z.string().openapi({
      description: "사용자 이름",
      example: "홍길동",
    }),
    email: z.string().email().openapi({
      description: "사용자 이메일",
      example: "regular_member@yonyoung.example",
    }),
    image: z.string().url().nullable().openapi({
      description: "프로필 이미지 URL (없으면 null)",
      example: "https://cdn.yonyoung.example/users/profile/member.png",
    }),
    nickname: z.string().nullable().openapi({
      description: "활동 닉네임 (없으면 null)",
      example: "길동",
    }),
    role: z.string().nullable().openapi({
      description: "원본 사용자 역할 문자열 (없으면 null)",
      example: "regular_member",
    }),
    generationId: z.string().uuid().nullable().openapi({
      description: "소속 기수 UUID (없으면 null)",
      example: EXAMPLE_GENERATION_ID,
    }),
    createdAt: timestampField("사용자 생성 시각", EXAMPLE_TIMESTAMP_MS),
    updatedAt: timestampField("사용자 수정 시각", EXAMPLE_TIMESTAMP_MS),
  })
  .openapi("ApiUser");

export const ApiAdminUpdateUserSchema = z
  .object({
    name: z.string().min(1).optional().openapi({
      description: "사용자 이름(관리자 수정 가능)",
      example: "홍길동",
    }),
    nickname: z.string().nullable().optional().openapi({
      description: "사용자 닉네임(관리자 수정 가능)",
      example: "길동",
    }),
    image: z.string().url().nullable().optional().openapi({
      description: "프로필 이미지 URL(관리자 수정 가능)",
      example: "https://cdn.yonyoung.example/users/profile/member-new.png",
    }),
    role: z
      .enum([
        "president",
        "vice_president",
        "manager",
        "new_member",
        "associate_member",
        "regular_member",
        "unverified",
      ])
      .optional()
      .openapi({
        description:
          "역할 문자열(관리자 전용). 기본 가입 역할은 `unverified`이며, 승인 시 member 계열 role(`new_member`/`associate_member`/`regular_member`)로 변경할 수 있습니다.",
        example: "manager",
      }),
    generationId: z.string().uuid().nullable().optional().openapi({
      description: "소속 기수 UUID(관리자 수정 가능)",
      example: EXAMPLE_GENERATION_ID,
    }),
  })
  .strict()
  .openapi("ApiAdminUpdateUserInput");

export const ApiMemberProfileUpdateSchema = z
  .object({
    name: z.string().min(1).optional().openapi({
      description: "본인 이름 수정",
      example: "홍길동",
    }),
    nickname: z.string().nullable().optional().openapi({
      description: "본인 닉네임 수정",
      example: "길동",
    }),
    image: z.string().url().nullable().optional().openapi({
      description: "본인 프로필 이미지 URL 수정",
      example: "https://cdn.yonyoung.example/users/profile/member-self.png",
    }),
  })
  .strict()
  .openapi("ApiMemberProfileUpdateInput");

export const ApiPresignRequestSchema = z
  .object({
    fileName: z.string().min(1, "fileName은 필수입니다.").openapi({
      description: "업로드할 파일명",
      example: "cover-image.jpg",
    }),
    contentType: z
      .string()
      .min(1)
      .refine((value) => value.startsWith("image/"), {
        message: "이미지 파일만 업로드할 수 있습니다.",
      })
      .openapi({
        description: "파일 MIME 타입 (`image/*`만 허용)",
        example: "image/jpeg",
      }),
  })
  .strict()
  .openapi("ApiPresignRequest");

export const ApiPresignResponseSchema = z
  .object({
    uploadUrl: z.string().url().openapi({
      description: "클라이언트가 직접 PUT 업로드할 presigned URL",
      example:
        "https://<account>.r2.cloudflarestorage.com/<bucket>/activities/cover/obj-key",
    }),
    objectKey: z.string().openapi({
      description: "스토리지 객체 키(서버에 저장할 내부 식별 문자열)",
      example: "activities/cover/66666666-6666-4666-8666-666666666666/cover-image.jpg",
    }),
    publicUrl: z.string().url().openapi({
      description: "업로드 후 DB에 저장할 공개 접근 URL",
      example: "https://cdn.yonyoung.example/activities/cover/cover-image.jpg",
    }),
    requiredHeaders: z
      .object({
        "Content-Type": z.string().openapi({
          description: "PUT 업로드 요청에 반드시 포함해야 하는 헤더",
          example: "image/jpeg",
        }),
      })
      .openapi({
        description: "presigned URL 업로드 시 필수 헤더",
      }),
  })
  .openapi("ApiPresignResponse");

export const ApiOpenApiDocumentSchema = z
  .object({
    openapi: z.string().openapi({
      description: "OpenAPI 문서 버전 문자열",
      example: "3.1.1",
    }),
    info: z.record(z.string(), z.any()).openapi({
      description: "문서 메타데이터(info)",
    }),
    paths: z.record(z.string(), z.any()).openapi({
      description: "API 경로/메서드 정의",
    }),
    components: z.record(z.string(), z.any()).optional().openapi({
      description: "스키마/보안/파라미터 컴포넌트",
    }),
    tags: z.array(z.any()).optional().openapi({
      description: "태그 목록",
    }),
    servers: z.array(z.any()).optional().openapi({
      description: "서버 목록",
    }),
  })
  .passthrough()
  .openapi("ApiOpenApiDocument");
