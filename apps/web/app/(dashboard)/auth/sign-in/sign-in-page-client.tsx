"use client";

import { useState } from "react";
import { signInWithGoogle } from "@/features/auth/client/auth-actions";

const resolveCanonicalSiteOrigin = (): string | null => {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) {
    return null;
  }

  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
};

export default function SignInPageClient() {
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsPending(true);
    setErrorMessage(null);

    const canonicalOrigin = resolveCanonicalSiteOrigin();
    if (canonicalOrigin && new URL(canonicalOrigin).host !== window.location.host) {
      const canonicalSignInUrl = new URL("/auth/sign-in", canonicalOrigin);
      canonicalSignInUrl.search = window.location.search;
      window.location.assign(canonicalSignInUrl.toString());
      return;
    }

    const callbackOrigin = canonicalOrigin ?? window.location.origin;
    const callbackURL = `${callbackOrigin}/auth/sign-in`;
    const signInResult = await signInWithGoogle({
      callbackURL,
      disableRedirect: true,
    });

    if (!signInResult.ok) {
      setErrorMessage(signInResult.errorMessage);
      setIsPending(false);
      return;
    }

    const redirectUrl = signInResult.data?.redirectUrl;
    if (!redirectUrl) {
      setErrorMessage("Google 로그인 리다이렉트 URL을 찾을 수 없습니다.");
      setIsPending(false);
      return;
    }

    window.location.assign(redirectUrl);
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-white dark:bg-slate-900 px-4 text-slate-900 dark:text-slate-50">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.12em] text-slate-600 dark:text-slate-300 uppercase">
          Dashboard Auth
        </p>
        <h1 className="mt-2 text-2xl font-bold">연영회 Dashboard 로그인</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          내부 운영 화면 이용을 위해 Google 계정으로 로그인해 주세요.
        </p>

        <button
          type="button"
          data-testid="auth-signin-google-submit"
          disabled={isPending}
          onClick={handleGoogleSignIn}
          className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 transition hover:bg-slate-100 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Google 로그인 중..." : "Google 계정으로 로그인"}
        </button>

        {errorMessage ? (
          <p className="mt-4 text-sm text-red-600">{errorMessage}</p>
        ) : null}
      </section>
    </main>
  );
}
