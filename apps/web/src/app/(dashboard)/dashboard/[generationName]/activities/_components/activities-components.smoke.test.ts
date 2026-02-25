import { describe, expect, it } from "vitest";
import ActivityCreateForm from "./activity-create-form";
import ActivityEditForm from "./activity-edit-form";
import GenerationActivityDetail from "./generation-activity-detail";
import GenerationActivitiesList from "./generation-activities-list";

describe("activities components smoke", () => {
  it("활동 관리 컴포넌트들이 정상적으로 import된다", () => {
    expect(typeof GenerationActivitiesList).toBe("function");
    expect(typeof ActivityCreateForm).toBe("function");
    expect(typeof GenerationActivityDetail).toBe("function");
    expect(typeof ActivityEditForm).toBe("function");
  });
});
