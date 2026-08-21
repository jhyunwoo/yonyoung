"use server";

import { forbidden } from "next/navigation";
import { canManageGlobalUsers } from "@/features/auth/model/auth-shared";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import {
  readNoContentSchema,
  writeRequest,
  type AdminWriteActionResult,
} from "@/features/dashboard/actions/admin-write-core";
import { CACHE_TAGS } from "@/server/cache/tags";
import {
  apiBulkUpdateUserRoleInputSchema,
  apiMemberProfileUpdateInputSchema,
  apiUpdateUserInputSchema,
  apiUserSchema,
} from "@/shared/contracts/api-schemas";
import type {
  ApiBulkUpdateUserRoleInput,
  ApiMemberProfileUpdateInput,
  ApiUpdateUserInput,
  ApiUser,
} from "@/shared/contracts/api-contracts";

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
  const session = await serverAuthGuard.requireSession();
  const canManageUsers = canManageGlobalUsers(session);
  let payload: ApiUpdateUserInput | ApiMemberProfileUpdateInput;

  if (canManageUsers) {
    payload = apiUpdateUserInputSchema.parse(input);
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

    payload = apiMemberProfileUpdateInputSchema.parse(input);
  }

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
  const payload = apiBulkUpdateUserRoleInputSchema.parse(input);
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
