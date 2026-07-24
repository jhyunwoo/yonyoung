import { expect, test } from "@playwright/test";

import { setMockSession } from "./support/session";
import {
  expectCollectionDelta,
  getMockState,
  resetMockState,
} from "./support/state-assert";

const MOCK_API_BASE_URL = "http://127.0.0.1:4010";

const makeNamespace = (projectName: string, parallelIndex: number, key: string): string =>
  `${projectName}-w${parallelIndex}-${key}`;

test.describe("domain CRUD journeys", () => {
  test("linktree create and delete mutate state", async ({
    page,
    context,
    request,
  }, testInfo) => {
    const namespace = makeNamespace(
      testInfo.project.name,
      testInfo.parallelIndex,
      "linktree",
    );
    await resetMockState(request, namespace);
    await setMockSession(context, { role: "president", namespace });

    const before = await getMockState(request, namespace);

    const createGroupResponse = await request.post(`${MOCK_API_BASE_URL}/api/linktree`, {
      headers: {
        "x-mock-worker": namespace,
        "x-mock-role": "president",
      },
      data: {
        name: "E2E 링크모음",
      },
    });
    expect(createGroupResponse.ok()).toBe(true);
    const createGroupJson = (await createGroupResponse.json()) as {
      data: { id: string };
    };
    const createdLinktreeId = createGroupJson.data.id;

    const createItemResponse = await request.post(
      `${MOCK_API_BASE_URL}/api/linktree/${encodeURIComponent(createdLinktreeId)}/items`,
      {
        headers: {
          "x-mock-worker": namespace,
          "x-mock-role": "president",
        },
        data: {
          name: "E2E 링크",
          link: "https://example.com/e2e",
        },
      },
    );
    expect(createItemResponse.ok()).toBe(true);

    const createdLength = before.linktrees.length + 1;
    await expect
      .poll(
        async () => {
          const state = await getMockState(request, namespace);
          return state.linktrees.length;
        },
        {
          timeout: 10_000,
        },
      )
      .toBe(createdLength);

    const created = await getMockState(request, namespace);
    expectCollectionDelta({
      before: before.linktrees,
      after: created.linktrees,
      delta: 1,
    });

    const newLinktree = created.linktrees.find((item) => item.name === "E2E 링크모음");
    expect(newLinktree).toBeDefined();
    await page.goto(`/dashboard/settings/linktree/${newLinktree!.id}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(
      new RegExp(`/dashboard/settings/linktree/${newLinktree!.id}$`),
    );

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("linktree-group-delete").click();
    await expect(page).toHaveURL(/\/dashboard\/settings\/linktree$/);

    const deletedLength = created.linktrees.length - 1;
    await expect
      .poll(
        async () => {
          const state = await getMockState(request, namespace);
          return state.linktrees.length;
        },
        {
          timeout: 10_000,
        },
      )
      .toBe(deletedLength);

    const afterDelete = await getMockState(request, namespace);
    expectCollectionDelta({
      before: created.linktrees,
      after: afterDelete.linktrees,
      delta: -1,
    });
  });

  test("site settings save updates mock state", async ({
    page,
    context,
    request,
  }, testInfo) => {
    const namespace = makeNamespace(
      testInfo.project.name,
      testInfo.parallelIndex,
      "site",
    );
    await resetMockState(request, namespace);
    await setMockSession(context, { role: "president", namespace });

    await page.goto("/dashboard/settings/site", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("site-settings-submit")).toBeVisible();

    const phoneInput = page.getByPlaceholder("010-0000-0000");
    await phoneInput.fill("010-9999-9999");

    await page.getByTestId("site-settings-submit").click();
    await expect(page.getByText("기본 설정을 저장했습니다.")).toBeVisible();

    const state = await getMockState(request, namespace);
    expect(state.siteSettings.footerPhone).toBe("010-9999-9999");
  });
});
