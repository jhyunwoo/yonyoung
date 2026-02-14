"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "../../../../lib/auth-client";

const DEFAULT_ERROR_MESSAGE =
  "로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";

const getErrorMessage = (error: unknown): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.length > 0
  ) {
    return error.message;
  }

  return DEFAULT_ERROR_MESSAGE;
};

export default function SignInPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [isPasskeyPending, setIsPasskeyPending] = useState(false);

  const isPending = isGooglePending || isPasskeyPending;

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsGooglePending(true);

    try {
      const callbackURL = `${window.location.origin}/admin`;
      const response = await authClient.signIn.social({
        provider: "google",
        callbackURL,
        disableRedirect: true,
      });

      if (response.error) {
        setErrorMessage(getErrorMessage(response.error));
        return;
      }

      const redirectUrl = response.data?.url;
      if (!redirectUrl) {
        setErrorMessage(DEFAULT_ERROR_MESSAGE);
        return;
      }

      window.location.href = redirectUrl;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsGooglePending(false);
    }
  };

  const handlePasskeySignIn = async () => {
    setErrorMessage(null);
    setIsPasskeyPending(true);

    try {
      const response = await authClient.signIn.passkey();
      if (response.error) {
        setErrorMessage(getErrorMessage(response.error));
        return;
      }

      router.replace("/admin");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsPasskeyPending(false);
    }
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
