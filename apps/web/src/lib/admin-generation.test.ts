import { describe, expect, it } from "vitest";
import {
  buildGenerationPath,
  extractGenerationRouteContext,
  getAccessibleGenerations,
  resolveGenerationBySortOrder,
} from "./admin-generation";

describe("admin-generation utilities", /** describe 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
  const generations = [
    { id: "g2", name: "2기", sortOrder: 2 },
    { id: "g1", name: "1기", sortOrder: 1 },
    { id: "g1b", name: "1기-보조", sortOrder: 1 },
  ];

  it("president는 모든 기수를 정렬된 순서로 접근한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
    const result = getAccessibleGenerations(
      {
        user: {
          role: "president",
        },
      },
      generations,
    );

    expect(result.map(/** result.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param item 반복 처리 중인 현재 항목입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (item) => item.id)).toEqual(["g1", "g1b", "g2"]);
  });

  it("일반 사용자는 본인 generationId와 일치하는 기수만 접근한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
    const result = getAccessibleGenerations(
      {
        user: {
          role: "regular_member",
          generationId: "g2",
        },
      },
      generations,
    );

    expect(result.map(/** result.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param item 반복 처리 중인 현재 항목입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (item) => item.id)).toEqual(["g2"]);
  });

  it("일반 사용자는 generationIds에 포함된 여러 기수에 접근한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
    const result = getAccessibleGenerations(
      {
        user: {
          role: "regular_member",
          generationIds: ["g1b", "g2"],
        },
      },
      generations,
    );

    expect(result.map((item) => item.id)).toEqual(["g1b", "g2"]);
  });

  it("세션이 없거나 generationId가 없으면 빈 배열을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
    expect(getAccessibleGenerations(null, generations)).toEqual([]);
    expect(
      getAccessibleGenerations(
        {
          user: {
            role: "regular_member",
          },
        },
        generations,
      ),
    ).toEqual([]);
  });

  it("resolveGenerationBySortOrder는 string/number 파라미터를 모두 지원한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
    expect(resolveGenerationBySortOrder(generations, "2")?.id).toBe("g2");
    expect(resolveGenerationBySortOrder(generations, 1)?.id).toBe("g1");
  });

  it("resolveGenerationBySortOrder는 유효하지 않거나 미존재 값에 null을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
    expect(resolveGenerationBySortOrder(generations, "not-number")).toBeNull();
    expect(resolveGenerationBySortOrder(generations, "999")).toBeNull();
  });

  it("buildGenerationPath는 resource path 유무에 따라 경로를 생성한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
    expect(buildGenerationPath(10)).toBe("/admin/10");
    expect(buildGenerationPath("10", "activities")).toBe("/admin/10/activities");
    expect(buildGenerationPath(" 10 ", "/users")).toBe("/admin/10/users");
    expect(buildGenerationPath(10, "")).toBe("/admin/10");
  });

  it("extractGenerationRouteContext는 admin 라우트 컨텍스트를 파싱한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
    expect(extractGenerationRouteContext("/admin/10/activities")).toEqual({
      sortOrder: 10,
      resourcePath: "activities",
    });

    expect(extractGenerationRouteContext("/admin/10")).toEqual({
      sortOrder: 10,
      resourcePath: null,
    });
  });

  it("extractGenerationRouteContext는 유효하지 않은 경로에서 null 컨텍스트를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
    expect(extractGenerationRouteContext("/home")).toEqual({
      sortOrder: null,
      resourcePath: null,
    });

    expect(extractGenerationRouteContext("/admin/not-number/activities")).toEqual({
      sortOrder: null,
      resourcePath: null,
    });
  });
});
