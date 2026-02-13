import type { AppEnv } from "@yonyoung/db";

export interface UploadedAsset {
  key: string;
  url: string;
  mimeType: string;
  size: number;
}

function extFromMime(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "bin";
}

export async function uploadImage(env: AppEnv, file: File, entity: string): Promise<UploadedAsset> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed");
  }

  const sizeLimit = 25 * 1024 * 1024;
  if (file.size > sizeLimit) {
    throw new Error("File is too large (max 25MB)");
  }

  const ext = extFromMime(file.type);
  const key = `${entity}/${crypto.randomUUID()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  await env.ASSETS.put(key, arrayBuffer, {
    httpMetadata: {
      contentType: file.type
    }
  });

  const base = (env as AppEnv & { R2_PUBLIC_BASE_URL?: string }).R2_PUBLIC_BASE_URL;
  const url = base ? `${base.replace(/\/$/, "")}/${key}` : `/r2/${key}`;

  return {
    key,
    url,
    mimeType: file.type,
    size: file.size
  };
}
