import { test, expect } from "./fixtures";
import {
  cleanupByPrefix,
  ensureAdminSession,
  provisionRoleUser,
  signInWithEmailPassword,
  uniqueText,
} from "./helpers";

const API_BASE_URL = process.env.E2E_API_URL ?? "http://localhost:8787";

const readJson = async <T>(response: { json: () => Promise<T> }): Promise<T> =>
  response.json();

test.describe("generations crud", () => {
  test.afterEach(async ({ page, e2ePrefix }) => {
    await ensureAdminSession(page);
    await cleanupByPrefix(page.request, e2ePrefix);
  });

  test("생성/수정/삭제와 권한 제한이 동작한다", async ({ page, e2ePrefix }) => {
    await ensureAdminSession(page);

    const generationName = uniqueText(e2ePrefix, "generation");
    const createResponse = await page.request.post(`${API_BASE_URL}/api/generations`, {
      data: {
        name: generationName,
        sortOrder: Date.now() % 1_000_000,
        startDate: Date.parse("2030-01-01T00:00:00.000Z"),
        endDate: Date.parse("2030-12-31T00:00:00.000Z"),
      },
    });
    expect(createResponse.status()).toBe(201);
    const createdBody = await readJson<{ data: { id: string; name: string } }>(createResponse);
    const generationId = createdBody.data.id;
    expect(createdBody.data.name).toBe(generationName);

    const updatedName = uniqueText(e2ePrefix, "generation-updated");
    const updateResponse = await page.request.patch(
      `${API_BASE_URL}/api/generations/${generationId}`,
      {
        data: { name: updatedName },
      },
    );
    expect(updateResponse.status()).toBe(200);
    const updatedBody = await readJson<{ data: { name: string } }>(updateResponse);
    expect(updatedBody.data.name).toBe(updatedName);

    const managerUser = await provisionRoleUser(page.request, {
      prefix: e2ePrefix,
      role: "manager",
      generationId,
    });
    await page.context().clearCookies();
    await signInWithEmailPassword(page, {
      email: managerUser.email,
      password: managerUser.password,
      expectedRole: "manager",
    });

    const forbiddenCreateResponse = await page.request.post(
      `${API_BASE_URL}/api/generations`,
      {
        data: {
          name: uniqueText(e2ePrefix, "forbidden-generation"),
          sortOrder: (Date.now() % 1_000_000) + 1,
          startDate: Date.parse("2030-01-01T00:00:00.000Z"),
          endDate: Date.parse("2030-12-31T00:00:00.000Z"),
        },
      },
    );
    expect(forbiddenCreateResponse.status()).toBe(403);

    await ensureAdminSession(page);
    const deleteResponse = await page.request.delete(
      `${API_BASE_URL}/api/generations/${generationId}`,
    );
    expect(deleteResponse.status()).toBe(204);
  });
});
