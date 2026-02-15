"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  signInWithGoogle,
  signInWithPasskey,
} from "../../../../lib/auth-client-tool";

/**
 * SignInPage 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default function SignInPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [isPasskeyPending, setIsPasskeyPending] = useState(false);

  const isPending = isGooglePending || isPasskeyPending;

    /**
   * handleGoogleSignIn의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
   * @returns 비동기 처리 결과를 Promise로 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsGooglePending(true);

    const callbackURL = `${window.location.origin}/admin`;
    const result = await signInWithGoogle({
      callbackURL,
      disableRedirect: true,
    });

    if (!result.ok) {
      setErrorMessage(result.errorMessage);
      setIsGooglePending(false);
      return;
    }

    const redirectUrl = result.data?.redirectUrl;
    if (!redirectUrl) {
      setErrorMessage("Google 로그인 리다이렉트 URL을 찾을 수 없습니다.");
      setIsGooglePending(false);
      return;
    }

    window.location.href = redirectUrl;
  };

    /**
   * handlePasskeySignIn의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
   * @returns 비동기 처리 결과를 Promise로 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  const handlePasskeySignIn = async () => {
    setErrorMessage(null);
    setIsPasskeyPending(true);

    const result = await signInWithPasskey();

    if (!result.ok) {
      setErrorMessage(result.errorMessage);
      setIsPasskeyPending(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h1 className="text-2xl font-bold">관리자 로그인</h1>
        <p className="mt-2 text-sm text-gray-600">
          관리자 페이지 접근을 위해 로그인해 주세요.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isPending}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGooglePending ? "Google 로그인 중..." : "Google로 로그인"}
          </button>

          <button
            type="button"
            onClick={handlePasskeySignIn}
            disabled={isPending}
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPasskeyPending ? "Passkey 로그인 중..." : "Passkey로 로그인"}
          </button>
        </div>

        {errorMessage ? (
          <p className="mt-4 text-sm text-red-600">{errorMessage}</p>
        ) : null}
      </div>
    </main>
  );
}
