import { AdminApiError } from "./types";
import { adminRequest } from "./http";
import type { ApiPresignResponse } from "./types";

export const PRESIGN_PATHS = {
  activityCover: "/activities/presign/cover",
  activityDetail: "/activities/presign/detail",
  exhibitionCover: "/exhibitions/presign/cover",
  exhibitionDetail: "/exhibitions/presign/detail",
  supporterLogo: "/supporters/presign/logo",
  userProfile: "/users/presign/profile",
} as const;

export type PresignPath = (typeof PRESIGN_PATHS)[keyof typeof PRESIGN_PATHS];
export type ImageValueMode = "url" | "file";

/**
 * defaultContentType의 핵심 비즈니스 로직을 수행합니다.
 * @param file 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const defaultContentType = (file: File): string => {
  if (file.type && file.type.startsWith("image/")) {
    return file.type;
  }

  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) {
    return "image/png";
  }
  if (name.endsWith(".webp")) {
    return "image/webp";
  }
  if (name.endsWith(".gif")) {
    return "image/gif";
  }
  return "image/jpeg";
};

/**
 * uploadWithPresign의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
 * @param input 함수 로직에서 사용하는 입력값입니다.
 * @returns 비동기 처리 결과를 Promise로 반환합니다.
 * @remarks 네트워크 실패/타임아웃 상황을 고려해 예외 처리와 기본값 규약을 유지해야 합니다.
 */
export const uploadWithPresign = async (input: {
  presignPath: PresignPath;
  file: File;
}): Promise<string> => {
  const contentType = defaultContentType(input.file);
  const presign = await adminRequest<ApiPresignResponse>(input.presignPath, "POST", {
    fileName: input.file.name,
    contentType,
  });

  const uploadHeaders = new Headers();
  const requiredContentType = presign.requiredHeaders?.["Content-Type"];
  uploadHeaders.set("Content-Type", requiredContentType ?? contentType);

  const uploadResponse = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: uploadHeaders,
    body: input.file,
  });

  if (!uploadResponse.ok) {
    throw new AdminApiError({
      status: uploadResponse.status,
      code: "UPLOAD_FAILED",
      message: "파일 업로드에 실패했습니다.",
    });
  }

  return presign.publicUrl;
};

/**
 * resolveImageValue 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
 * @param input 함수 로직에서 사용하는 입력값입니다.
 * @returns 조회/계산된 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const resolveImageValue = async (input: {
  mode: ImageValueMode;
  urlValue: string;
  file: File | null;
  presignPath: PresignPath;
  fieldLabel: string;
}): Promise<string> => {
  if (input.mode === "url") {
    const url = input.urlValue.trim();
    if (!url) {
      throw new Error(`${input.fieldLabel} URL을 입력해 주세요.`);
    }
    return url;
  }

  if (!input.file) {
    throw new Error(`${input.fieldLabel} 파일을 선택해 주세요.`);
  }

  return uploadWithPresign({
    presignPath: input.presignPath,
    file: input.file,
  });
};
