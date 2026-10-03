import { getTableColumns, getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import { getAuthTables } from "better-auth/db";
import { describe, expect, it } from "vitest";
import { account, session, user, verification } from "../platform/db/schema";

// Better Auth는 버전 업그레이드에서 코어 모델에 필드를 추가한다(1.7의 account.issuer 등).
// Drizzle 스키마가 따라가지 않으면 어댑터가 런타임에서만
// `The field "x" does not exist in the schema for the model "y"`로 터지므로,
// 여기서 두 스키마의 필드 집합을 정적으로 대조한다.
const authTables = getAuthTables({
  socialProviders: {
    google: { clientId: "test-client-id", clientSecret: "test-client-secret" },
  },
  emailAndPassword: { enabled: true },
  plugins: [],
});

const drizzleTables = { user, session, account, verification } as const;

describe("Better Auth 코어 스키마 ↔ Drizzle 스키마 정합성", () => {
  it.each(Object.keys(drizzleTables) as (keyof typeof drizzleTables)[])(
    "%s 모델이 요구하는 모든 필드를 Drizzle 테이블이 선언한다",
    (model) => {
      const expectedFields = Object.keys(authTables[model]?.fields ?? {});
      const declaredFields = Object.keys(getTableColumns(drizzleTables[model]));

      expect(expectedFields.length).toBeGreaterThan(0);
      expect(declaredFields).toEqual(expect.arrayContaining(expectedFields));
    },
  );

  it("Better Auth가 요구하는 고유 인덱스를 Drizzle 테이블이 선언한다", () => {
    for (const [model, table] of Object.entries(drizzleTables)) {
      const requiredUniqueIndexes = (
        authTables[model]?.indexes ?? []
      ).filter((index) => index.unique);
      if (requiredUniqueIndexes.length === 0) {
        continue;
      }

      // Drizzle 어댑터는 물리 컬럼명이 아니라 스키마 객체의 키로 필드를 찾으므로
      // (snake_case 컬럼이어도 동작한다) 인덱스 비교도 키 기준으로 수행한다.
      const keyByColumnName = new Map(
        Object.entries(getTableColumns(table)).map(([key, column]) => [
          column.name,
          key,
        ]),
      );
      const declaredUniqueIndexes = getTableConfig(table)
        .indexes.filter((index) => index.config.unique)
        .map((index) =>
          index.config.columns
            // SQL 식 기반 인덱스는 Better Auth가 요구하는 컬럼 인덱스가 아니므로 제외한다.
            .filter((column) => "name" in column)
            .map((column) => keyByColumnName.get(column.name) ?? column.name)
            .join(","),
        );

      for (const required of requiredUniqueIndexes) {
        const requiredColumns = required.fields.join(",");
        expect(
          declaredUniqueIndexes,
          `${getTableName(table)} 테이블에 (${requiredColumns}) 고유 인덱스가 필요하다`,
        ).toContain(requiredColumns);
      }
    }
  });
});
