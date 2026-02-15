import path from "node:path";
import { test as base, expect } from "@playwright/test";

const currentDir = __dirname;

type E2EFixtures = {
  e2ePrefix: string;
  sampleImagePath: string;
};

export const test = base.extend<E2EFixtures>({
  e2ePrefix: async ({}, use, testInfo) => {
    const prefix = `e2e-${Date.now()}-${testInfo.workerIndex}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    await use(prefix);
  },
  sampleImagePath: async ({}, use) => {
    await use(path.resolve(currentDir, "assets", "test-image.png"));
  },
});

export { expect };
