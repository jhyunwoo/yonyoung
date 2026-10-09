/**
 * 스트림 앞부분을 읽어 돌려주고, 읽은 부분을 포함한 전체를 다시 읽을 수 있는 스트림을 준다.
 * 형식 검사를 R2에 쓰기 전에 끝내려고 쓴다.
 */
export const peekStream = async (
  stream: ReadableStream<Uint8Array>,
  size: number,
): Promise<{ head: Uint8Array; stream: ReadableStream<Uint8Array> }> => {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let finished = false;

  while (total < size) {
    const { done, value } = await reader.read();
    if (done) {
      finished = true;
      break;
    }
    chunks.push(value);
    total += value.byteLength;
  }

  const head = new Uint8Array(Math.min(total, size));
  let offset = 0;
  for (const chunk of chunks) {
    if (offset >= head.length) {
      break;
    }
    const part = chunk.subarray(0, head.length - offset);
    head.set(part, offset);
    offset += part.length;
  }

  const replay = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      if (finished) {
        controller.close();
      }
    },
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });

  return { head, stream: replay };
};

export class StreamLengthMismatchError extends Error {
  constructor(expected: number, received: number) {
    super(`받은 바이트(${received})가 선언한 크기(${expected})와 다릅니다.`);
    this.name = "StreamLengthMismatchError";
  }
}

/** 선언한 바이트 수와 정확히 같아야 정상 종료되는 스트림. */
export const enforceExactLength = (
  stream: ReadableStream<Uint8Array>,
  expected: number,
): ReadableStream<Uint8Array> => {
  let received = 0;
  return stream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        received += chunk.byteLength;
        if (received > expected) {
          controller.error(new StreamLengthMismatchError(expected, received));
          return;
        }
        controller.enqueue(chunk);
      },
      flush() {
        if (received !== expected) {
          throw new StreamLengthMismatchError(expected, received);
        }
      },
    }),
  );
};
