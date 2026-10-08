import { z } from "zod";
import {
  ApiCreateLinktreeItemSchema,
  ApiCreateLinktreeSchema,
  ApiUpdateLinktreeItemSchema,
  ApiUpdateLinktreeSchema,
} from "../../linktree/linktree.contract";
import { routeTool, uuidArg } from "../tool-definition";

const linktreeId = uuidArg("링크 모음 ID. linktree_list로 찾습니다.");

const itemId = uuidArg("링크 ID. linktree_get 결과의 items[].id입니다.");
export const linktreeTools = [
  routeTool({
    name: "linktree_list",
    method: "GET",
    path: "/api/linktree",
    inputSchema: z.object({}),
    summary: "링크 모음 목록입니다.",
  }),
  routeTool({
    name: "linktree_get",
    method: "GET",
    path: "/api/linktree/{id}",
    inputSchema: z.object({ id: linktreeId }),
    summary: "링크 모음 정보입니다.",
  }),
  routeTool({
    name: "linktree_create",
    method: "POST",
    path: "/api/linktree",
    inputSchema: z.object({ data: ApiCreateLinktreeSchema }),
    summary: "링크 모음을 만들었습니다.",
  }),
  routeTool({
    name: "linktree_update",
    method: "PATCH",
    path: "/api/linktree/{id}",
    inputSchema: z.object({ id: linktreeId, data: ApiUpdateLinktreeSchema }),
    summary: "링크 모음을 수정했습니다.",
  }),
  routeTool({
    name: "linktree_delete",
    method: "DELETE",
    path: "/api/linktree/{id}",
    inputSchema: z.object({ id: linktreeId }),
    summary: "링크 모음을 삭제했습니다.",
  }),
  routeTool({
    name: "linktree_item_add",
    method: "POST",
    path: "/api/linktree/{id}/items",
    inputSchema: z.object({ id: linktreeId, data: ApiCreateLinktreeItemSchema }),
    summary: "링크를 추가했습니다.",
  }),
  routeTool({
    name: "linktree_item_update",
    method: "PATCH",
    path: "/api/linktree/{id}/items/{itemId}",
    inputSchema: z.object({ id: linktreeId, itemId, data: ApiUpdateLinktreeItemSchema }),
    summary: "링크를 수정했습니다.",
  }),
  routeTool({
    name: "linktree_item_delete",
    method: "DELETE",
    path: "/api/linktree/{id}/items/{itemId}",
    inputSchema: z.object({ id: linktreeId, itemId }),
    summary: "링크를 삭제했습니다.",
  }),
];
