"use client";

export type ImageInputMode = "url" | "file";

type ImageInputProps = {
  label: string;
  mode: ImageInputMode;
  onModeChange: (mode: ImageInputMode) => void;
  urlValue: string;
  onUrlChange: (value: string) => void;
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
  testIdPrefix: string;
};

export default function ImageInput({
  label,
  mode,
  onModeChange,
  urlValue,
  onUrlChange,
  file,
  onFileChange,
  disabled = false,
  testIdPrefix,
}: ImageInputProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name={`${testIdPrefix}-mode`}
              checked={mode === "url"}
              onChange={() => onModeChange("url")}
              disabled={disabled}
              data-testid={`${testIdPrefix}-mode-url`}
            />
            URL 입력
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name={`${testIdPrefix}-mode`}
              checked={mode === "file"}
              onChange={() => onModeChange("file")}
              disabled={disabled}
              data-testid={`${testIdPrefix}-mode-file`}
            />
            파일 업로드
          </label>
        </div>
      </div>

      {mode === "url" ? (
        <input
          type="url"
          value={urlValue}
          onChange={(event) => onUrlChange(event.target.value)}
          disabled={disabled}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="https://..."
          data-testid={`${testIdPrefix}-url`}
        />
      ) : (
        <div className="space-y-1">
          <input
            type="file"
            accept="image/*"
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
            disabled={disabled}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            data-testid={`${testIdPrefix}-file`}
          />
          <p className="text-xs text-gray-500" data-testid={`${testIdPrefix}-file-name`}>
            {file ? file.name : "선택된 파일 없음"}
          </p>
        </div>
      )}
    </div>
  );
}
