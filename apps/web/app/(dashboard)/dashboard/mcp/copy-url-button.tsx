"use client";

import { useState } from "react";
import { Button } from "@/app/(dashboard)/_components/ui";

export default function CopyUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="break-all rounded-md border border-hairline bg-surface-sunken px-3 py-2 text-body-sm text-ink">
        {url}
      </code>
      <Button
        variant="secondary"
        onClick={() => {
          void navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          });
        }}
      >
        {copied ? "복사했습니다" : "주소 복사"}
      </Button>
    </div>
  );
}
