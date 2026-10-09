import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const consentMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/auth/client/auth-client", () => ({
  authClient: { oauth2: { consent: consentMock } },
}));

import McpConsentClient from "@/app/(dashboard)/auth/mcp-consent/consent-client";

const context = {
  client: { clientId: "client-1", name: "Claude", uri: null },
  redirectHost: "claude.ai",
  scopes: ["mcp"],
  overview: {
    serverUrl: "http://localhost:8787/mcp",
    role: "member",
    tools: [
      {
        name: "whoami",
        title: "내 정보 보기",
        description: "내 계정 정보를 조회합니다.",
        category: "account",
        readOnly: true,
        destructive: false,
        examplePrompt: "내 정보 알려줘",
      },
    ],
  },
};

const UNKNOWN_HOST_WARNING =
  "Claude나 ChatGPT가 아닌 주소입니다. 직접 연결을 시작한 게 아니라면 거절하세요.";

const stubContext = (overrides: Partial<typeof context> = {}) =>
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { ...context, ...overrides } }),
    }),
  );

afterEach(() => {
  vi.unstubAllGlobals();
  consentMock.mockReset();
});

describe("McpConsentClient", () => {
  it("동의 정보를 가져오다 네트워크 오류가 나면 오류 안내를 보여준다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network")));
    render(<McpConsentClient />);
    expect(
      await screen.findByText(
        "연결 요청을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      ),
    ).toBeTruthy();
  });

  it("허용 처리 중 예외가 나면 버튼을 다시 쓸 수 있게 하고 안내를 보여준다", async () => {
    stubContext();
    consentMock.mockRejectedValue(new Error("boom"));
    render(<McpConsentClient />);
    const allow = (await screen.findByRole("button", {
      name: "허용",
    })) as HTMLButtonElement;
    await userEvent.click(allow);
    expect(
      await screen.findByText("처리하지 못했습니다. 다시 시도해 주세요."),
    ).toBeTruthy();
    await waitFor(() => expect(allow.disabled).toBe(false));
  });

  it("돌아갈 주소가 Claude나 ChatGPT가 아니면 경고한다", async () => {
    stubContext({ redirectHost: "claude-mcp.example" });
    render(<McpConsentClient />);
    expect(
      await screen.findByText("허용하면 claude-mcp.example(으)로 돌아갑니다."),
    ).toBeTruthy();
    expect(screen.getByText(UNKNOWN_HOST_WARNING)).toBeTruthy();
  });

  it("claude.ai로 돌아가면 경고하지 않는다", async () => {
    stubContext();
    render(<McpConsentClient />);
    expect(await screen.findByText("허용하면 claude.ai(으)로 돌아갑니다.")).toBeTruthy();
    expect(screen.queryByText(UNKNOWN_HOST_WARNING)).toBeNull();
  });
});
