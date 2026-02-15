import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import {
  cleanupByPrefix,
  ensureAdminSession,
  ensureGeneration,
  getRoleMatrixRoles,
  provisionRoleUser,
  signInWithEmailPassword,
} from "./helpers";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

const expectForbiddenPage = async (page: Page): Promise<void> => {
  const customForbiddenHeading = page.getByRole("heading", {
    name: "관리자 페이지 접근 권한이 없습니다.",
  });

  if ((await customForbiddenHeading.count()) > 0) {
    await expect(customForbiddenHeading).toBeVisible();
    return;
  }

  await expect(page.getByText("This page could not be accessed.")).toBeVisible();
};

const expectNotFoundPage = async (page: Page): Promise<void> => {
  await expect(
    page.getByRole("heading", { name: "요청한 관리자 페이지를 찾을 수 없습니다." }),
  ).toBeVisible();
};

test.describe("admin access matrix", () => {
  test.afterEach(async ({ request }, testInfo) => {
    const prefix = testInfo.annotations.find((item) => item.type === "e2e-prefix")?.description;
    if (prefix) {
      await cleanupByPrefix(request, prefix);
    }
  });

  test("role-based access boundaries across admin routes", async ({
    browser,
    page,
    request,
    e2ePrefix,
  }) => {
    test.slow();
    test.info().annotations.push({ type: "e2e-prefix", description: e2ePrefix });

    await ensureAdminSession(page);

    const primaryGeneration = await ensureGeneration(request, e2ePrefix);
    const secondaryGeneration = await ensureGeneration(request, e2ePrefix);

    const roleUsers = await Promise.all(
      getRoleMatrixRoles().map((role) =>
        provisionRoleUser(request, {
          prefix: e2ePrefix,
          role,
          generationId: primaryGeneration.id,
        }),
      ),
    );

    for (const roleUser of roleUsers) {
      const context = await browser.newContext({
        baseURL: BASE_URL,
        storageState: { cookies: [], origins: [] },
      });
      const rolePage = await context.newPage();

      try {
        await signInWithEmailPassword(rolePage, {
          email: roleUser.email,
          password: roleUser.password,
          expectedRole: roleUser.assignedRole,
        });

        await rolePage.goto("/admin");
        if (roleUser.assignedRole === "unverified") {
          await expectForbiddenPage(rolePage);
        } else {
          await expect(rolePage).toHaveURL(/\/admin\/\d+$/);
          await expect(rolePage.getByTestId("admin-shell")).toBeVisible();
        }

        await rolePage.goto("/admin/generations");
        if (roleUser.assignedRole === "president") {
          await expect(rolePage.getByTestId("generations-page")).toBeVisible();
        } else if (roleUser.assignedRole === "unverified") {
          await expectForbiddenPage(rolePage);
        } else {
          await expect(rolePage).not.toHaveURL(/\/admin\/generations$/);
          await expect(rolePage.getByTestId("admin-shell")).toBeVisible();
        }

        await rolePage.goto(`/admin/${primaryGeneration.sortOrder}/activities`);
        if (roleUser.assignedRole === "unverified") {
          await expectForbiddenPage(rolePage);
        } else {
          await expect(rolePage.getByTestId("activities-page")).toBeVisible();
        }

        await rolePage.goto(`/admin/${secondaryGeneration.sortOrder}/activities`);
        if (roleUser.assignedRole === "president") {
          await expect(rolePage.getByTestId("activities-page")).toBeVisible();
        } else {
          await expectForbiddenPage(rolePage);
        }

        await rolePage.goto("/admin/999999999/activities");
        if (roleUser.assignedRole === "unverified") {
          await expectForbiddenPage(rolePage);
        } else {
          await expectNotFoundPage(rolePage);
        }
      } finally {
        await context.close();
      }
    }

    await cleanupByPrefix(request, e2ePrefix);
  });
});
