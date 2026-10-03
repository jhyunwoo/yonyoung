import { z } from "../../shared/openapi/zod";
import {
  EXAMPLE_GENERATION_ID,
  EXAMPLE_TIMESTAMP_MS,
  EXAMPLE_TIMESTAMP_MS_END,
  timestampField,
} from "../../shared/openapi/field-builders";
import { ApiAuditActorSchema } from "../audit/audit.contract";

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
    updatedBy: ApiAuditActorSchema.nullable().openapi({
      description: "마지막 수정자 정보 (로그가 없으면 null)",
    }),
  })
  .openapi("ApiGeneration");

const GenerationInputObjectSchema = z.object({
  name: z.string().trim().min(1, "name은 필수입니다.").openapi({
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
});

export const ApiCreateGenerationSchema = GenerationInputObjectSchema.refine(
  (value) => value.startDate <= value.endDate,
  {
    message: "기수 종료일은 시작일보다 빠를 수 없습니다.",
    path: ["endDate"],
  },
).openapi("ApiCreateGenerationInput");

export const ApiUpdateGenerationSchema = GenerationInputObjectSchema.partial()
  .refine(
    (value) =>
      value.startDate === undefined ||
      value.endDate === undefined ||
      value.startDate <= value.endDate,
    {
      message: "기수 종료일은 시작일보다 빠를 수 없습니다.",
      path: ["endDate"],
    },
  )
  .openapi("ApiUpdateGenerationInput");

export const ApiReorderGenerationsSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            id: z.string().uuid("id 형식이 올바르지 않습니다.").openapi({
              description: "순서를 바꿀 기수 UUID",
              example: EXAMPLE_GENERATION_ID,
            }),
            sortOrder: z.number().int().nonnegative().openapi({
              description: "새 정렬 순서(0 이상)",
              example: 12,
            }),
          })
          .strict(),
      )
      .min(1, "순서를 바꿀 기수를 하나 이상 전달해야 합니다.")
      .max(100, "한 번에 최대 100개 기수까지 순서를 바꿀 수 있습니다.")
      .refine(
        (items) => new Set(items.map((item) => item.id)).size === items.length,
        {
          message: "중복된 기수 id를 전달할 수 없습니다.",
        },
      )
      .refine(
        (items) =>
          new Set(items.map((item) => item.sortOrder)).size === items.length,
        { message: "같은 정렬 순서를 두 기수에 줄 수 없습니다." },
      ),
  })
  .strict()
  .openapi("ApiReorderGenerationsInput");
