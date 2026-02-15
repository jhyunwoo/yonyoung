import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { AppBindings } from "../../types/honoAppType";
import type { PresignService } from "../services/types";

type StorageEnv = {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
};

const FALLBACK_SIGNED_URL_EXPIRES_IN = 300;

const storageEnvKeyMap = {
  endpoint: "R2_S3_ENDPOINT",
  accessKeyId: "R2_ACCESS_KEY_ID",
  secretAccessKey: "R2_SECRET_ACCESS_KEY",
  bucket: "R2_BUCKET",
  publicBaseUrl: "R2_PUBLIC_BASE_URL",
} as const;

type StorageEnvKey = keyof typeof storageEnvKeyMap;

export class MissingStorageConfigError extends Error {
  readonly missingKeys: string[];

  constructor(missingKeys: string[]) {
    super(
      `필수 스토리지 설정이 누락되었습니다: ${missingKeys.join(", ")}`,
    );
    this.name = "MissingStorageConfigError";
    this.missingKeys = missingKeys;
  }
}

const getEnvValue = (
  env: AppBindings,
  key: StorageEnvKey,
): string | undefined => {
  const envKey = storageEnvKeyMap[key];
  const bindingValue = env[envKey];
  if (typeof bindingValue === "string" && bindingValue.trim()) {
    return bindingValue.trim();
  }

  const processValue = process.env[envKey];
  if (processValue?.trim()) {
    return processValue.trim();
  }

  return undefined;
};

const sanitizeFileName = (fileName: string): string => {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return "file";
  }

  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
};

const encodeKeyForPublicUrl = (key: string) => {
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
};

const resolveStorageEnv = (env: AppBindings): StorageEnv => {
  const endpoint = getEnvValue(env, "endpoint");
  const accessKeyId = getEnvValue(env, "accessKeyId");
  const secretAccessKey = getEnvValue(env, "secretAccessKey");
  const bucket = getEnvValue(env, "bucket");
  const publicBaseUrl = getEnvValue(env, "publicBaseUrl");

  const missingKeys: string[] = [];
  if (!endpoint) {
    missingKeys.push(storageEnvKeyMap.endpoint);
  }
  if (!accessKeyId) {
    missingKeys.push(storageEnvKeyMap.accessKeyId);
  }
  if (!secretAccessKey) {
    missingKeys.push(storageEnvKeyMap.secretAccessKey);
  }
  if (!bucket) {
    missingKeys.push(storageEnvKeyMap.bucket);
  }
  if (!publicBaseUrl) {
    missingKeys.push(storageEnvKeyMap.publicBaseUrl);
  }

  if (missingKeys.length > 0) {
    throw new MissingStorageConfigError(missingKeys);
  }

  return {
    endpoint,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBaseUrl: publicBaseUrl.replace(/\/+$/, ""),
  };
};

export const createR2PresignService = (env: AppBindings): PresignService => {
  const storageEnv = resolveStorageEnv(env);
  const client = new S3Client({
    region: "auto",
    endpoint: storageEnv.endpoint,
    credentials: {
      accessKeyId: storageEnv.accessKeyId,
      secretAccessKey: storageEnv.secretAccessKey,
    },
  });

  return {
    async issuePresignedPutUrl(input) {
      const safeFileName = sanitizeFileName(input.fileName);
      const objectKey = `${input.resource}/${input.actorId}/${input.slot}/${Date.now()}-${safeFileName}`;

      const command = new PutObjectCommand({
        Bucket: storageEnv.bucket,
        Key: objectKey,
        ContentType: input.contentType,
      });

      const uploadUrl = await getSignedUrl(client, command, {
        expiresIn: FALLBACK_SIGNED_URL_EXPIRES_IN,
      });

      const publicUrl = `${storageEnv.publicBaseUrl}/${encodeKeyForPublicUrl(objectKey)}`;

      return {
        uploadUrl,
        objectKey,
        publicUrl,
        requiredHeaders: {
          "Content-Type": input.contentType,
        },
      };
    },
  };
};
