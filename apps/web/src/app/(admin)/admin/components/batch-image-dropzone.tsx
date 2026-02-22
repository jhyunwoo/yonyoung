"use client";

import { type ChangeEvent, type DragEvent, useId, useState } from "react";

type BatchImageDropzoneProps = {
  title: string;
  description: string;
  disabled?: boolean;
  testId: string;
  onFilesSelected: (files: File[]) => void;
};

export default function BatchImageDropzone({
  title,
  description,
  disabled = false,
  testId,
  onFilesSelected,
}: BatchImageDropzoneProps) {
  const inputId = useId();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const nextFiles = Array.from(files ?? []);
    if (nextFiles.length === 0 || disabled) {
      return;
    }
    onFilesSelected(nextFiles);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
    event.target.value = "";
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    handleFiles(event.dataTransfer.files);
  };

  return (
    <label
      htmlFor={inputId}
      className={`relative block rounded-xl border-2 border-dashed p-4 transition ${
        disabled
          ? "cursor-not-allowed border-gray-300 bg-gray-100"
          : isDragOver
            ? "cursor-pointer border-[var(--admin-accent)] bg-[var(--admin-surface-subtle)]"
            : "cursor-pointer border-[var(--admin-border-strong)] bg-[var(--admin-surface)] hover:border-[var(--admin-accent)] hover:bg-[var(--admin-surface-muted)]"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid={testId}
    >
      <input
        id={inputId}
        type="file"
        accept="image/*"
        multiple
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        onChange={handleInputChange}
        disabled={disabled}
        data-testid={`${testId}-file`}
      />
      <div className="pointer-events-none flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        </div>
        <span className="shrink-0 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700">
          파일 선택
        </span>
      </div>
    </label>
  );
}
