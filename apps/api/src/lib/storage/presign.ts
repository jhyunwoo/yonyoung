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

    /**
   * constructor의 핵심 비즈니스 로직을 수행합니다.
   * @param missingKeys 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  constructor(missingKeys: string[]) {
    super(
      `필수 스토리지 설정이 누락되었습니다: ${missingKeys.join(", ")}`,
    );
    this.name = "MissingStorageConfigError";
    this.missingKeys = missingKeys;
  }
}

/**
 * getEnvValue 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
 * @param env 함수 로직에서 사용하는 입력값입니다.
 * @param key 함수 로직에서 사용하는 입력값입니다.
 * @returns 조회/계산된 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
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

/**
 * sanitizeFileName의 핵심 비즈니스 로직을 수행합니다.
 * @param fileName 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const sanitizeFileName = (fileName: string): string => {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return "file";
  }

  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
};

/**
 * encodeKeyForPublicUrl의 핵심 비즈니스 로직을 수행합니다.
 * @param key 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const encodeKeyForPublicUrl = (key: string) => {
  return key
    .split("/")
    .map(/** key
    .split("/")
    .map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param segment 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (segment) => encodeURIComponent(segment))
    .join("/");
};

/**
 * resolveStorageEnv 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
 * @param env 함수 로직에서 사용하는 입력값입니다.
 * @returns 조회/계산된 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
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

/**
 * createR2PresignService 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param env 함수 로직에서 사용하는 입력값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
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
        /**
     * issuePresignedPutUrl 조건을 평가해 사용 가능 여부를 판별합니다.
     * @param input 함수 로직에서 사용하는 입력값입니다.
     * @returns 조건 판별 결과(boolean)를 반환합니다.
     * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
     */
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
