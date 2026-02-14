export const ROLE_VALUES = [
  "president",
  "vice_president",
  "manager",
  "member",
] as const;

export type Role = (typeof ROLE_VALUES)[number];

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
