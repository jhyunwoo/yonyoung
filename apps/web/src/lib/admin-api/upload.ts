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
