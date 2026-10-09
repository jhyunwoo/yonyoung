"use client";

import { useRef, useState, type DragEvent } from "react";
import type { ApiMcpUploadLookup } from "@yonyoung/contracts/mcp";
import { Alert, Button, Card, CardBody } from "@/app/(dashboard)/_components/ui";
import { checkSelectedFile } from "@/features/mcp/upload-check";

type UploadState =
  | { status: "idle"; error: string | null }
  | { status: "uploading"; percent: number }
  | { status: "done" };

/** API 도메인으로 직접 PUT한다. 진행률을 보이려고 XMLHttpRequest를 쓴다. */
const putFile = (url: string, file: File, onProgress: (percent: number) => void) =>
  new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("content-type", file.type || "application/octet-stream");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onload = () => {
      if (request.status === 200) {
        resolve();
        return;
      }
      const message = (() => {
        try {
          return (JSON.parse(request.responseText) as { error?: { message?: string } })
            .error?.message;
        } catch {
          return undefined;
        }
      })();
      reject(new Error(message ?? `업로드하지 못했습니다(HTTP ${request.status}).`));
    };
    request.onerror = () => reject(new Error("네트워크 오류로 업로드하지 못했습니다."));
    request.onabort = () =>
      reject(new Error("업로드가 중단되었습니다. 다시 시도해 주세요."));
    request.ontimeout = () =>
      reject(new Error("업로드가 중단되었습니다. 다시 시도해 주세요."));
    request.send(file);
  });

export default function McpUploadClient({ lookup }: { lookup: ApiMcpUploadLookup }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>({ status: "idle", error: null });
  const [dragging, setDragging] = useState(false);
  const busyRef = useRef(false);

  const upload = async (file: File) => {
    if (busyRef.current) {
      return;
    }
    const problem = checkSelectedFile(file, lookup);
    if (problem) {
      setState({ status: "idle", error: problem });
      return;
    }
    setState({ status: "uploading", percent: 0 });
    try {
      await putFile(lookup.putUrl, file, (percent) =>
        setState({ status: "uploading", percent }),
      );
      setState({ status: "done" });
    } catch (error) {
      setState({
        status: "idle",
        error: error instanceof Error ? error.message : "업로드하지 못했습니다.",
      });
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      void upload(file);
    }
  };

  if (state.status === "done") {
    return (
      <Alert tone="success" title="올렸습니다">
        대화로 돌아가 &lsquo;올렸어&rsquo;라고 알려 주세요. AI가 확인한 뒤 이어서
        작업합니다.
      </Alert>
    );
  }

  return (
    <Card>
      <CardBody>
        <p className="text-body-sm text-ink">
          올릴 파일: <strong>{lookup.fileName}</strong> (
          {lookup.declaredSize.toLocaleString("ko-KR")} bytes)
        </p>
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`mt-4 flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 text-center ${
            dragging ? "border-(--focus-ring) bg-surface-sunken" : "border-hairline"
          }`}
        >
          <p className="text-body-sm text-ink-muted">파일을 여기로 끌어다 놓거나</p>
          <Button
            variant="primary"
            disabled={state.status === "uploading"}
            onClick={() => inputRef.current?.click()}
          >
            {state.status === "uploading"
              ? `올리는 중… ${state.percent}%`
              : "파일 고르기"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={lookup.contentType}
            className="sr-only"
            aria-label="올릴 파일"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) {
                void upload(file);
              }
            }}
          />
        </div>
        {state.status === "idle" && state.error ? (
          <Alert tone="danger" className="mt-4">
            {state.error}
          </Alert>
        ) : null}
      </CardBody>
    </Card>
  );
}
