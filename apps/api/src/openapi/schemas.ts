import { z } from "@hono/zod-openapi";

export const OPENAPI_TAGS = {
  system: "System",
  public: "Public",
  admin: "Admin"
} as const;

export const errorEnvelopeSchema = z.object({
  error: z.object({
    message: z.string(),
    details: z.unknown().optional()
  })
});

export const deletedSchema = z.object({
  deleted: z.literal(true)
});

export function dataEnvelopeSchema<T extends z.ZodTypeAny>(schema: T) {
  return z.object({ data: schema });
}

export function jsonContent<T extends z.ZodTypeAny>(schema: T) {
  return {
    "application/json": {
      schema
    }
  } as const;
}

export const unauthorizedResponse = {
  description: "Unauthorized",
  content: jsonContent(errorEnvelopeSchema)
} as const;

export const forbiddenResponse = {
  description: "Forbidden",
  content: jsonContent(errorEnvelopeSchema)
} as const;

export const notFoundResponse = {
  description: "Not found",
  content: jsonContent(errorEnvelopeSchema)
} as const;

export const badRequestResponse = {
  description: "Bad request",
  content: jsonContent(errorEnvelopeSchema)
} as const;

export const internalErrorResponse = {
  description: "Internal server error",
  content: jsonContent(errorEnvelopeSchema)
} as const;
