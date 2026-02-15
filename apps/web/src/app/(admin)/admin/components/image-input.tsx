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

/**
 * ImageInput 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @param {
  label,
  mode,
  onModeChange,
  urlValue,
  onUrlChange,
  file,
  onFileChange,
  disabled = false,
  testIdPrefix,
} 대상을 식별하기 위한 ID 값입니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
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
              onChange={/** 반환 값 계산 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => onModeChange("url")}
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
              onChange={/** 반환 값 계산 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => onModeChange("file")}
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
          onChange={/** 조건 분기 처리 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param event 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (event) => onUrlChange(event.target.value)}
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
            onChange={/** 조건 분기 처리 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param event 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (event) => onFileChange(event.target.files?.[0] ?? null)}
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
