"use client";

import dynamic from "next/dynamic";

/**
 * Tiptap 에디터는 폼에서 가장 큰 의존성이다. 첫 화면 JS에서 빼고 브라우저에서 따로 불러온다.
 * 에디터는 원래 서버에서 그리지 않으므로(immediatelyRender: false) ssr을 꺼도 잃는 것이 없다.
 * 불러오는 동안에는 툴바와 편집 영역 높이만큼 자리를 잡아 레이아웃이 밀리지 않게 한다.
 */
const LazyRichTextEditor = dynamic(
  () => import("@/app/(dashboard)/_components/rich-text-editor"),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-2" aria-hidden="true">
        <div className="h-[42px] rounded-lg border border-hairline bg-surface-sunken" />
        <div
          className="rounded-lg border border-hairline-strong bg-surface"
          style={{ minHeight: 238 }}
        />
      </div>
    ),
  },
);

export default LazyRichTextEditor;
