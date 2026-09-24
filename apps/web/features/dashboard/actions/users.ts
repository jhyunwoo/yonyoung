"use server";

import { forbidden } from "next/navigation";
import { canManageGlobalUsers } from "@/features/auth/model/auth-shared";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import {
  readNoContentSchema,
  writeRequest,
  type AdminWriteActionResult,
  toSessionUnavailableFailure,
} from "@/features/dashboard/actions/admin-write-core";
import { parseActionInput } from "@/features/dashboard/actions/action-input";
import { isSessionUnavailableError } from "@/features/auth/server/auth-server";
import { CACHE_TAGS } from "@/server/cache/tags";
import {
  apiBulkUpdateUserRoleInputSchema,
  apiMemberProfileUpdateInputSchema,
  apiUpdateUserInputSchema,
  apiUserSchema,
} from "@yonyoung/contracts/schemas";
import type {
  ApiBulkUpdateUserRoleInput,
  ApiMemberProfileUpdateInput,
  ApiUpdateUserInput,
  ApiUser,
} from "@yonyoung/contracts";

const USER_CACHE_TAGS = [
  CACHE_TAGS.admin.users,
  CACHE_TAGS.admin.generations,
  CACHE_TAGS.public.photographers,
] as const;

export type BulkUpdateUsersRoleActionResult = AdminWriteActionResult<ApiUser[]>;

export const updateUserAction = async (
  id: string,
  input: ApiUpdateUserInput,
): Promise<AdminWriteActionResult<ApiUser>> => {
  let session: Awaited<ReturnType<typeof serverAuthGuard.requireSession>>;
  try {
    session = await serverAuthGuard.requireSession();
  } catch (error) {
    if (isSessionUnavailableError(error)) {
      return toSessionUnavailableFailure(error);
    }
    throw error;
  }
  const canManageUsers = canManageGlobalUsers(session);
  let parsedPayload:
    | ReturnType<typeof parseActionInput<ApiUpdateUserInput>>
    | ReturnType<typeof parseActionInput<ApiMemberProfileUpdateInput>>;

  if (canManageUsers) {
    parsedPayload = parseActionInput(apiUpdateUserInputSchema, input);
  } else {
    const profile = await serverAuthGuard.getCurrentUserProfile(session);
    const currentProfileId =
      profile && typeof profile.id === "string" ? profile.id.trim() : "";
    const allowedUserIds = new Set(
      [session.user.id, currentProfileId].filter(
        (value): value is string => typeof value === "string" && value.length > 0,
      ),
    );

    if (!allowedUserIds.has(id)) {
      forbidden();
    }

    parsedPayload = parseActionInput(apiMemberProfileUpdateInputSchema, input);
  }
  if (!parsedPayload.ok) {
    return parsedPayload;
  }
  const payload = parsedPayload.data;

  return writeRequest({
    path: `/users/${id}`,
    method: "PATCH",
    body: payload,
    responseSchema: apiUserSchema,
    requireAdminAccess: canManageUsers,
    tags: USER_CACHE_TAGS,
  });
};

export const bulkUpdateUsersRoleAction = async (
  input: ApiBulkUpdateUserRoleInput,
): Promise<BulkUpdateUsersRoleActionResult> => {
  const parsedPayload = parseActionInput(apiBulkUpdateUserRoleInputSchema, input);
  if (!parsedPayload.ok) {
    return parsedPayload;
  }
  const payload = parsedPayload.data;
  return writeRequest({
    path: "/users/bulk-role",
    method: "PATCH",
    body: payload,
    responseSchema: apiUserSchema.array(),
    accessScope: "user_manager",
    tags: USER_CACHE_TAGS,
  });
};

export const deleteUserAction = async (
  id: string,
): Promise<AdminWriteActionResult<void>> => {
  return writeRequest({
    path: `/users/${id}`,
    method: "DELETE",
    responseSchema: readNoContentSchema,
    accessScope: "user_manager",
    tags: USER_CACHE_TAGS,
  });
};
