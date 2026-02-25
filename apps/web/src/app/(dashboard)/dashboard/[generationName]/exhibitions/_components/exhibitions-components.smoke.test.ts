import { describe, expect, it } from "vitest";
import ExhibitionCreateForm from "./exhibition-create-form";
import ExhibitionEditForm from "./exhibition-edit-form";
import GenerationExhibitionDetail from "./generation-exhibition-detail";
import GenerationExhibitionsList from "./generation-exhibitions-list";

describe("exhibitions components smoke", () => {
  it("핵심 컴포넌트가 함수로 export된다", () => {
    expect(typeof ExhibitionCreateForm).toBe("function");
    expect(typeof ExhibitionEditForm).toBe("function");
    expect(typeof GenerationExhibitionDetail).toBe("function");
    expect(typeof GenerationExhibitionsList).toBe("function");
  });
});
