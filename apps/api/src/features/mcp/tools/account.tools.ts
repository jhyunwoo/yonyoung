import { CORE_ROLE_LABELS } from "@yonyoung/contracts/auth-roles";
import { z } from "zod";
import { listExposedTools } from "../exposure";
import { ApiMemberProfileUpdateSchema } from "../../users/user.contract";
import { defineTool, routeTool } from "../tool-definition";
import { describeApiFailure, toolFailure, toolSuccess } from "../tool-result";

export const accountTools = [
  defineTool({
    name: "whoami",
    inputSchema: z.object({}),
    handler: async (_args, context) => {
      const result = await context.api.call({
        method: "GET",
        path: "/api/users/me",
      });
      if (!result.ok) {
        return toolFailure(describeApiFailure(result, context.actor.role));
      }
      const roleLabel = CORE_ROLE_LABELS[context.actor.role];
      const tools = listExposedTools(context.actor.role).map((tool) => ({
        name: tool.name,
        title: tool.title,
      }));
      return toolSuccess(
        `${context.actor.name}님은 ${roleLabel} 역할로 연결되어 있습니다. 쓸 수 있는 도구는 ${tools.length}개입니다.`,
        { user: result.data, role: context.actor.role, roleLabel, tools },
      );
    },
  }),
  routeTool({
    name: "my_profile_update",
    method: "PATCH",
    path: "/api/users/{id}",
    inputSchema: z.object({
      data: ApiMemberProfileUpdateSchema.describe(
        "바꿀 프로필 필드만 넣습니다.",
      ),
    }),
    toRequest: (args, context) => ({
      pathParams: { id: context.actor.id },
      body: args.data,
    }),
    summary: "내 프로필을 수정했습니다.",
  }),
];
