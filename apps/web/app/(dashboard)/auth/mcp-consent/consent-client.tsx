"use client";

import { useEffect, useState } from "react";
import { CORE_ROLE_LABELS, normalizeLegacyRole } from "@yonyoung/contracts/auth-roles";
import { apiMcpConsentContextSchema, type ApiMcpConsentContext } from "@yonyoung/contracts/mcp";
import { Alert, Button, Card, CardBody, CardHeader } from "@/app/(dashboard)/_components/ui";
import { authClient } from "@/features/auth/client/auth-client";
import { groupToolsByCategory } from "@/features/mcp/mcp-tool-groups";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; context: ApiMcpConsentContext };

const readConsentContext = async (): Promise<LoadState> => {
  const response = await fetch(`/api/mcp/consent-context${window.location.search}`, {
    credentials: "include",
    cache: "no-store",
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      (body as { error?: { message?: string } } | null)?.error?.message ??
      "연결 요청을 확인하지 못했습니다.";
    return { status: "error", message };
  }
  const parsed = apiMcpConsentContextSchema.safeParse((body as { data?: unknown } | null)?.data);
  return parsed.success
    ? { status: "ready", context: parsed.data }
    : { status: "error", message: "연결 요청 정보를 읽지 못했습니다." };
};

export default function McpConsentClient() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [submitting, setSubmitting] = useState<"accept" | "deny" | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    void readConsentContext().then(setState);
  }, []);

  const submit = async (accept: boolean) => {
    setSubmitting(accept ? "accept" : "deny");
    setSubmitError(null);
    const result = await authClient.oauth2.consent({ accept });
    const url = (result.data as { url?: string } | null)?.url;
    if (url) {
      window.location.assign(url);
      return;
    }
    setSubmitting(null);
    setSubmitError(result.error?.message ?? "처리하지 못했습니다. 다시 시도해 주세요.");
  };

  if (state.status === "loading") {
    return <p className="p-6 text-body-sm text-ink-muted">연결 요청을 확인하고 있습니다…</p>;
  }
  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-lg p-6">
        <Alert tone="danger" title="연결할 수 없습니다">
          {state.message}
        </Alert>
      </div>
    );
  }

  const { client, overview } = state.context;
  const role = normalizeLegacyRole(overview.role);
  const clientName = client.name ?? client.clientId;
  const isPending = role === "unverified";

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 p-6">
      <h1 className="text-h3 text-ink">{clientName} 연결</h1>
      <p className="text-body-sm text-ink-muted">
        {clientName}이(가) {CORE_ROLE_LABELS[role]} 권한으로 연영 대시보드에 접근하려고 합니다.
        허용하면 대화 중에 아래 작업을 할 수 있습니다. 연결은 대시보드의 &lsquo;AI 연결&rsquo;에서 언제든 해제할 수
        있습니다.
      </p>

      {isPending ? (
        <Alert tone="warning" title="관리자 승인 대기 중">
          가입 승인이 끝나면 연결할 수 있습니다. 운영진에게 승인을 요청해 주세요.
        </Alert>
      ) : (
        <Card>
          <CardHeader title={`쓸 수 있는 작업 ${overview.tools.length}개`} headingLevel={2} />
          <CardBody>
            <ul className="flex flex-col gap-3">
              {groupToolsByCategory(overview.tools).map((group) => (
                <li key={group.category}>
                  <p className="text-caption font-semibold text-ink">{group.label}</p>
                  <p className="text-caption text-ink-muted">
                    {group.tools.map((tool) => tool.title).join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {submitError ? <Alert tone="danger">{submitError}</Alert> : null}

      <div className="flex gap-2">
        <Button
          variant="primary"
          disabled={isPending || submitting !== null}
          onClick={() => void submit(true)}
        >
          {submitting === "accept" ? "연결하는 중…" : "허용"}
        </Button>
        <Button variant="secondary" disabled={submitting !== null} onClick={() => void submit(false)}>
          거절
        </Button>
      </div>
    </main>
  );
}
