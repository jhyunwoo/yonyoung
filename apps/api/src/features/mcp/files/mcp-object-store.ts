export interface McpObjectStore {
  put(
    objectKey: string,
    body: ReadableStream<Uint8Array>,
    options: { contentType: string; size: number },
  ): Promise<void>;
  delete(objectKey: string): Promise<void>;
}

/**
 * R2는 길이를 모르는 스트림을 받지 않는다. FixedLengthStream이 길이를 알려 주고,
 * 실제 바이트 수가 다르면 쓰기가 실패한다.
 */
export const createR2McpObjectStore = (bucket: R2Bucket): McpObjectStore => ({
  async put(objectKey, body, { contentType, size }) {
    const fixed = new FixedLengthStream(size);
    await Promise.all([
      body.pipeTo(fixed.writable),
      bucket.put(objectKey, fixed.readable, { httpMetadata: { contentType } }),
    ]);
  },
  async delete(objectKey) {
    await bucket.delete(objectKey);
  },
});

export const createMemoryMcpObjectStore = () => {
  const objects = new Map<string, { bytes: Uint8Array; contentType: string }>();
  const store: McpObjectStore & { objects: typeof objects } = {
    objects,
    async put(objectKey, body, { contentType }) {
      const bytes = new Uint8Array(await new Response(body).arrayBuffer());
      objects.set(objectKey, { bytes, contentType });
    },
    async delete(objectKey) {
      objects.delete(objectKey);
    },
  };
  return store;
};
