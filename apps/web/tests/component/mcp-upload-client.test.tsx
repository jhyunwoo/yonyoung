import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import McpUploadClient from "@/app/(dashboard)/dashboard/mcp/upload/[token]/upload-client";

const lookup = {
  uploadId: "upload-1",
  fileName: "봄출사.jpg",
  contentType: "image/jpeg",
  declaredSize: 4,
  purpose: "activity_image",
  status: "pending",
  expiresAt: "2099-01-01T00:00:00.000Z",
  putUrl: "http://127.0.0.1:4010/mcp/uploads/valid-token",
} as const;

const makeFile = () =>
  new File([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], "봄출사.jpg", {
    type: "image/jpeg",
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("McpUploadClient", () => {
  it("올리는 동안 다시 파일을 골라도 두 번째 PUT을 시작하지 않는다", async () => {
    const instances: FakeXhr[] = [];
    class FakeXhr {
      status = 0;
      responseText = "";
      upload: { onprogress: unknown } = { onprogress: null };
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onabort: (() => void) | null = null;
      ontimeout: (() => void) | null = null;
      send = vi.fn();
      open = vi.fn();
      setRequestHeader = vi.fn();
      constructor() {
        instances.push(this);
      }
    }
    vi.stubGlobal("XMLHttpRequest", FakeXhr);

    render(<McpUploadClient lookup={lookup} />);
    const input = screen.getByLabelText("올릴 파일");

    fireEvent.change(input, { target: { files: [makeFile()] } });
    await waitFor(() => expect(instances[0]?.send).toHaveBeenCalledTimes(1));

    fireEvent.change(input, { target: { files: [makeFile()] } });
    fireEvent.drop(input.parentElement as HTMLElement, {
      dataTransfer: { files: [makeFile()] },
    });
    expect(instances).toHaveLength(1);

    instances[0].status = 200;
    instances[0].onload?.();
    await waitFor(() => expect(screen.getByText("올렸습니다")).toBeTruthy());
    expect(instances).toHaveLength(1);
  });
});
