"use client";

import { Bot } from "lucide-react";
import { useRef, useState } from "react";
import type { ApiMcpConnection } from "@yonyoung/contracts/mcp";
import {
  Button,
  EmptyState,
  useConfirm,
  useToast,
} from "@/app/(dashboard)/_components/ui";
import { revokeMcpConnectionAction } from "@/features/dashboard/actions/mcp";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(value));

export default function McpConnectionsClient({
  initialConnections,
}: {
  initialConnections: ApiMcpConnection[];
}) {
  const [connections, setConnections] = useState(initialConnections);
  const [pendingClientId, setPendingClientId] = useState<string | null>(null);
  const pendingRef = useRef(false);
  const confirm = useConfirm();
  const toast = useToast();

  if (connections.length === 0) {
    return (
      <EmptyState
        Icon={Bot}
        title="연결된 앱이 없습니다"
        description="Claude나 ChatGPT에서 연결하면 여기에 표시됩니다."
      />
    );
  }

  const revoke = async (connection: ApiMcpConnection) => {
    if (pendingRef.current) {
      return;
    }
    pendingRef.current = true;
    setPendingClientId(connection.clientId);
    try {
      const name = connection.clientName ?? connection.clientId;
      const confirmed = await confirm({
        title: `${name} 연결을 해제할까요?`,
        description:
          "해제하면 그 앱에서 연영 도구를 바로 쓸 수 없습니다. 다시 쓰려면 다시 연결해야 합니다.",
        confirmLabel: "연결 해제",
        tone: "danger",
      });
      if (!confirmed) {
        return;
      }
      const result = await revokeMcpConnectionAction(connection.clientId);
      if (!result.ok) {
        toast({
          tone: "danger",
          title: "연결을 해제하지 못했습니다",
          description: result.errorMessage,
        });
        return;
      }
      setConnections((current) =>
        current.filter((item) => item.clientId !== connection.clientId),
      );
      toast({ tone: "success", title: `${name} 연결을 해제했습니다` });
    } finally {
      pendingRef.current = false;
      setPendingClientId(null);
    }
  };

  return (
    <ul className="flex flex-col divide-y divide-hairline">
      {connections.map((connection) => (
        <li
          key={connection.clientId}
          className="flex items-center justify-between gap-3 py-3"
        >
          <span className="min-w-0">
            <span className="block text-body-sm font-semibold text-ink">
              {connection.clientName ?? connection.clientId}
            </span>
            <span className="block text-caption text-ink-muted">
              연결 {formatDate(connection.connectedAt)} · 최근 갱신{" "}
              {formatDate(connection.updatedAt)}
            </span>
          </span>
          <Button
            variant="danger-ghost"
            disabled={pendingClientId === connection.clientId}
            onClick={() => void revoke(connection)}
          >
            연결 해제
          </Button>
        </li>
      ))}
    </ul>
  );
}
