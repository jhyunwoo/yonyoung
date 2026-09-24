"use client";

import { type FormEvent, useRef } from "react";

/**
 * `<form onSubmit>` 핸들러를 만든다. 비동기 저장이 끝나기 전의 재제출은 무시한다.
 *
 * `<form action={fn}>`(React 19 액션)을 쓰지 않는 이유: 액션은 트랜지션 안에서 실행되어
 * 첫 `await` 전에 부른 `setIsSaving(true)` 같은 상태 변경이 액션이 끝날 때까지 커밋되지
 * 않는다. 그러면 저장 중에도 입력·사진 추가·삭제 버튼이 활성 상태로 남아, 저장이 이미
 * 읽어 간 옛 상태와 화면이 어긋난다. 이벤트 핸들러에서 호출하면 상태가 즉시 반영된다.
 */
export const useGuardedSubmit = (
  handler: () => Promise<void> | void,
): ((event: FormEvent<HTMLFormElement>) => void) => {
  const inFlightRef = useRef(false);

  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    void Promise.resolve()
      .then(handler)
      .finally(() => {
        inFlightRef.current = false;
      });
  };
};
