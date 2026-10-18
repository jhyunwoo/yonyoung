import type { ApiLinktree, ApiLinktreeItem } from "@yonyoung/contracts";
import { readErrorMessage } from "@/shared/http/read-error-message";

export const readLinktreeErrorMessage = (error: unknown): string =>
  readErrorMessage(error, "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");

export const sortLinktreesByName = (linktrees: ApiLinktree[]): ApiLinktree[] => {
  return [...linktrees].sort((left, right) => left.name.localeCompare(right.name, "ko"));
};

export const findLinktreeItemById = (
  linktree: ApiLinktree,
  itemId: string,
): ApiLinktreeItem | null => {
  return linktree.items.find((item) => item.id === itemId) ?? null;
};

export const normalizeLinktreeName = (name: string): string => name.trim();

export const normalizeLinktreeItemInput = (input: {
  name: string;
  link: string;
}): {
  name: string;
  link: string;
} => ({
  name: input.name.trim(),
  link: input.link.trim(),
});
