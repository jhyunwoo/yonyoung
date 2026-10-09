import { getTableColumns, getTableName } from "drizzle-orm";
import { getTableConfig, type SQLiteTable } from "drizzle-orm/sqlite-core";
import { getAuthTables } from "better-auth/db";
import { jwt } from "better-auth/plugins";
import { mcp } from "@better-auth/mcp";
import { describe, expect, it } from "vitest";
import {
  account,
  jwks,
  oauthAccessToken,
  oauthClient,
  oauthClientAssertion,
  oauthClientResource,
  oauthConsent,
  oauthRefreshToken,
  oauthResource,
  session,
  user,
  verification,
} from "../platform/db/schema";

const CORE_MODELS = ["user", "session", "account", "verification"];

const baseAuthOptions = {
  socialProviders: {
    google: { clientId: "test-client-id", clientSecret: "test-client-secret" },
  },
  emailAndPassword: { enabled: true },
};

// Better Auth는 버전 업그레이드에서 코어 모델에 필드를 추가하거나 제거한다.
// Drizzle 스키마가 따라가지 않으면 어댑터가 런타임에서만
// `The field "x" does not exist in the schema for the model "y"`로 터지므로,
// 여기서 두 스키마의 필드 집합을 정적으로 대조한다.
const describeSchemaParity = (
  title: string,
  authTables: ReturnType<typeof getAuthTables>,
  drizzleTables: Record<string, SQLiteTable>,
) => {
  describe(title, () => {
    const models = Object.keys(drizzleTables);

    it.each(models)("%s 모델이 요구하는 모든 필드를 Drizzle 테이블이 선언한다", (model) => {
      const expectedFields = Object.keys(authTables[model]?.fields ?? {});
      const declaredFields = Object.keys(getTableColumns(drizzleTables[model]!));

      expect(expectedFields.length).toBeGreaterThan(0);
      expect(declaredFields).toEqual(expect.arrayContaining(expectedFields));
    });

    it.each(models)("%s 모델에 Better Auth가 쓰지 않는 필수 컬럼이 없다", (model) => {
      const expectedFields = Object.keys(authTables[model]?.fields ?? {});
      const unwrittenRequiredFields = Object.entries(getTableColumns(drizzleTables[model]!))
        .filter(
          ([key, column]) =>
            !expectedFields.includes(key) && column.notNull && !column.hasDefault && !column.primary,
        )
        .map(([key]) => key);
      expect(unwrittenRequiredFields).toEqual([]);
    });

    it.each(models)("%s 모델의 unique 필드를 Drizzle 컬럼도 unique로 선언한다", (model) => {
      const columns = getTableColumns(drizzleTables[model]!);
      for (const [field, definition] of Object.entries(authTables[model]?.fields ?? {})) {
        if (definition.unique) {
          expect(columns[field]?.isUnique, `${model}.${field}`).toBe(true);
        }
      }
    });

    it("Better Auth가 요구하는 고유 인덱스를 Drizzle 테이블이 선언한다", () => {
      for (const [model, table] of Object.entries(drizzleTables)) {
        const requiredUniqueIndexes = (authTables[model]?.indexes ?? []).filter(
          (index) => index.unique,
        );
        if (requiredUniqueIndexes.length === 0) {
          continue;
        }

        // Drizzle 어댑터는 물리 컬럼명이 아니라 스키마 객체의 키로 필드를 찾으므로
        // (snake_case 컬럼이어도 동작한다) 인덱스 비교도 키 기준으로 수행한다.
        const keyByColumnName = new Map(
          Object.entries(getTableColumns(table)).map(([key, column]) => [column.name, key]),
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
};

describeSchemaParity(
  "Better Auth 코어 스키마 ↔ Drizzle 스키마 정합성",
  getAuthTables({ ...baseAuthOptions, plugins: [] }),
  { user, session, account, verification },
);

const oauthAuthTables = getAuthTables({
  ...baseAuthOptions,
  plugins: [
    jwt(),
    mcp({
      loginPage: "/auth/sign-in",
      consentPage: "/auth/mcp-consent",
      resource: "https://api.example.test/mcp",
    }),
  ],
});

const oauthDrizzleTables = {
  jwks,
  oauthClient,
  oauthResource,
  oauthClientResource,
  oauthRefreshToken,
  oauthAccessToken,
  oauthConsent,
  oauthClientAssertion,
};

describeSchemaParity(
  "Better Auth OAuth 플러그인 스키마 ↔ Drizzle 스키마 정합성",
  oauthAuthTables,
  oauthDrizzleTables,
);

describe("OAuth 플러그인 모델 목록", () => {
  it("플러그인이 요구하는 모델을 모두 Drizzle 테이블로 선언한다", () => {
    const pluginModels = Object.keys(oauthAuthTables)
      .filter((model) => !CORE_MODELS.includes(model))
      .sort();
    expect(Object.keys(oauthDrizzleTables).sort()).toEqual(pluginModels);
  });
});
