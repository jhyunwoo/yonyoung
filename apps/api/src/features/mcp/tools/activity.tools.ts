import { z } from "zod";
import { ApiListActivitiesQuerySchema } from "../../activities/activity.contract";
import { routeTool, uuidArg } from "../tool-definition";

const activityId = uuidArg("활동 ID. activity_list로 찾습니다.");

export const activityTools = [
  routeTool({
    name: "activity_list",
    method: "GET",
    path: "/api/activities",
    inputSchema: ApiListActivitiesQuerySchema,
    summary: "활동 목록입니다.",
  }),
  routeTool({
    name: "activity_get",
    method: "GET",
    path: "/api/activities/{id}",
    inputSchema: z.object({ id: activityId }),
    summary: "활동 정보입니다.",
  }),
];
