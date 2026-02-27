import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GenerationManagementClient from "./generation-management-client";

const routerRefresh = vi.fn();

const listGenerationsMock = vi.fn();
const listUsersMock = vi.fn();
const createGenerationMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: routerRefresh,
  }),
}));

vi.mock("../../../../../lib/admin-api/resources", () => ({
  adminResourceApi: {
    listGenerations: (...args: unknown[]) => listGenerationsMock(...args),
    listUsers: (...args: unknown[]) => listUsersMock(...args),
    createGeneration: (...args: unknown[]) => createGenerationMock(...args),
    updateGeneration: vi.fn(),
    deleteGeneration: vi.fn(),
    updateUser: vi.fn(),
  },
}));

Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });

const flushEffects = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

const setInputValue = (input: HTMLInputElement, value: string) => {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;

  if (valueSetter) {
    valueSetter.call(input, value);
  } else {
    input.value = value;
  }

  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
};

describe("GenerationManagementClient", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    routerRefresh.mockReset();
    listGenerationsMock.mockReset();
    listUsersMock.mockReset();
    createGenerationMock.mockReset();

    listGenerationsMock.mockResolvedValue([
      {
        id: "gen-59",
        name: "59기",
        sortOrder: 59,
        startDate: Date.parse("2024-01-01T00:00:00.000Z"),
        endDate: Date.parse("2024-12-31T00:00:00.000Z"),
        updatedAt: Date.parse("2024-12-31T00:00:00.000Z"),
        updatedBy: null,
      },
    ]);
    listUsersMock.mockResolvedValue([]);
    createGenerationMock.mockResolvedValue({
      id: "gen-60",
      name: "60기",
      sortOrder: 60,
      startDate: Date.parse("2025-01-01T00:00:00.000Z"),
      endDate: Date.parse("2025-12-31T00:00:00.000Z"),
      updatedAt: Date.parse("2025-01-01T00:00:00.000Z"),
      updatedBy: null,
    });

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("기수 생성 성공 시 사이드바 갱신을 위해 router.refresh를 호출한다", async () => {
    await act(async () => {
      root.render(<GenerationManagementClient />);
      await flushEffects();
      await flushEffects();
    });

    const createForm = Array.from(container.querySelectorAll("form")).find((form) =>
      form.textContent?.includes("기수 생성"),
    );
    expect(createForm).toBeTruthy();

    const nameInput = createForm?.querySelector(
      "input[placeholder='예: 60기']",
    ) as HTMLInputElement | null;
    const sortOrderInput = createForm?.querySelector(
      "input[placeholder='예: 60']",
    ) as HTMLInputElement | null;
    const dateInputs = createForm?.querySelectorAll(
      "input[type='date']",
    ) as NodeListOf<HTMLInputElement>;

    expect(nameInput).toBeTruthy();
    expect(sortOrderInput).toBeTruthy();
    expect(dateInputs?.length).toBe(2);

    await act(async () => {
      if (nameInput) {
        setInputValue(nameInput, "60기");
      }

      if (sortOrderInput) {
        setInputValue(sortOrderInput, "60");
      }

      if (dateInputs?.[0]) {
        setInputValue(dateInputs[0], "2025-01-01");
      }

      if (dateInputs?.[1]) {
        setInputValue(dateInputs[1], "2025-12-31");
      }

      await flushEffects();
    });

    expect(createForm instanceof HTMLFormElement).toBe(true);

    await act(async () => {
      if (createForm instanceof HTMLFormElement) {
        createForm.requestSubmit();
      }
      await flushEffects();
      await flushEffects();
    });

    expect(createGenerationMock).toHaveBeenCalledTimes(1);
    expect(routerRefresh).toHaveBeenCalledTimes(1);
  });
});
