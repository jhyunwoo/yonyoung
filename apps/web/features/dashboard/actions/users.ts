"use server";

import { forbidden } from "next/navigation";
import {
  canAccessAdminPage,
  canManageGlobalUsers,
} from "@/features/auth/model/auth-shared";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import {
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

// 승인 대기 사용자는 공개 페이지나 기수 명단에 나오지 않는다. 누구나 가입만 하면 프로필을
// 고칠 수 있으므로, 그 쓰기가 공개 캐시까지 비우게 두면 캐시를 계속 무효화할 수 있다.
const UNVERIFIED_USER_CACHE_TAGS = [CACHE_TAGS.admin.users] as const;

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
    path: `/users/${encodeURIComponent(id)}`,
    method: "PATCH",
    body: payload,
    responseSchema: apiUserSchema,
    requireAdminAccess: canManageUsers,
    tags: canAccessAdminPage(session) ? USER_CACHE_TAGS : UNVERIFIED_USER_CACHE_TAGS,
  });
};

export const bulkUpdateUsersRoleAction = async (
  input: ApiBulkUpdateUserRoleInput,
): Promise<BulkUpdateUsersRoleActionResult> => {
  return writeRequest({
    path: "/users/bulk-role",
    method: "PATCH",
    bodySchema: apiBulkUpdateUserRoleInputSchema,
    body: input,
    responseSchema: apiUserSchema.array(),
    accessScope: "user_manager",
    tags: USER_CACHE_TAGS,
  });
};
