import { CORE_ROLE_VALUES, type CoreRole } from "@repo/shared-auth/roles";

export const ROLE_VALUES = CORE_ROLE_VALUES;

export type Role = CoreRole;

export type Resource =
  | "generation"
  | "activity"
  | "supporter"
  | "exhibition"
  | "linktree"
  | "user";

export type Action = "create" | "read" | "update" | "delete";

export type Actor = {
  id: string;
  role: Role;
  rawRole: string;
  name: string;
  email: string;
  generationId: string | null;
};
