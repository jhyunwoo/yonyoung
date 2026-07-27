"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Alert } from "@/app/(dashboard)/_components/ui/alert";
import { Button } from "@/app/(dashboard)/_components/ui/button";
import { signInWithGoogle } from "@/features/auth/client/auth-actions";

type SignInPageClientProps = {
  authCanonicalOrigin?: string | null;
};

const parseOrigin = (value: string | null | undefined): string | null => {
  const raw = value?.trim();
  if (!raw) {
    return null;
  }

  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
};

const resolveCanonicalSiteOrigin = (
  authCanonicalOrigin?: string | null,
): string | null => {
  const explicitOrigin = parseOrigin(authCanonicalOrigin);
  if (explicitOrigin) {
    return explicitOrigin;
  }

  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) {
    return null;
  }

  return parseOrigin(raw);
};

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} focusable="false">
    <path
      d="M21.82 12.233c0-.793-.071-1.554-.204-2.284H12v4.32h5.498a4.704 4.704 0 0 1-2.041 3.086v2.56h3.305c1.935-1.782 3.058-4.408 3.058-7.682Z"
      fill="#4285F4"
    />
    <path
      d="M12 22c2.76 0 5.076-.915 6.768-2.485l-3.305-2.56c-.915.614-2.084.977-3.463.977-2.653 0-4.902-1.791-5.706-4.2H2.878v2.64A10.22 10.22 0 0 0 12 22Z"
      fill="#34A853"
    />
    <path
      d="M6.294 13.732A6.14 6.14 0 0 1 5.975 12c0-.6.108-1.181.319-1.732v-2.64H2.878A10.224 10.224 0 0 0 1.8 12c0 1.64.393 3.193 1.078 4.372l3.416-2.64Z"
      fill="#FBBC05"
    />
    <path
      d="M12 6.068c1.5 0 2.848.516 3.91 1.529l2.93-2.93C17.07 3.027 14.754 2 12 2a10.22 10.22 0 0 0-9.122 5.628l3.416 2.64c.804-2.41 3.053-4.2 5.706-4.2Z"
      fill="#EA4335"
    />
  </svg>
);

export default function SignInPageClient({ authCanonicalOrigin }: SignInPageClientProps) {
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsPending(true);
    setErrorMessage(null);

    const canonicalOrigin = resolveCanonicalSiteOrigin(authCanonicalOrigin);
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
    // 셸(DashboardShell)은 /auth/* 를 우회하므로 이 페이지가 스스로 <main> 이자
    // 캔버스가 된다.
    <main
      data-testid="auth-signin-page"
      className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10 text-ink"
    >
      <section className="w-full max-w-md rounded-xl border border-hairline bg-surface p-6 shadow-soft sm:p-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-hairline bg-surface-sunken">
            <Image
              src="/yonyoung-logo-black.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 object-contain dark:invert"
            />
          </span>
          <div className="min-w-0">
            <p className="text-eyebrow text-ink-muted uppercase">연영회 대시보드</p>
            <h1 className="mt-1 text-h3 text-ink">로그인</h1>
          </div>
        </div>

        <p className="mt-6 text-body-sm text-ink-muted">
          내부 운영 화면입니다. 승인된 Google 계정으로 로그인해 주세요.
        </p>

        <Button
          data-testid="auth-signin-google-submit"
          variant="secondary"
          size="lg"
          fullWidth
          className="mt-5"
          isPending={isPending}
          pendingLabel="Google 로그인 중..."
          leadingIcon={<GoogleIcon className="h-5 w-5 shrink-0" />}
          onClick={handleGoogleSignIn}
        >
          Google 계정으로 로그인
        </Button>

        {errorMessage !== null && (
          <Alert tone="danger" className="mt-4">
            {errorMessage}
          </Alert>
        )}

        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-1 rounded-md text-body-sm font-medium text-ink-muted transition-colors duration-150 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) motion-reduce:transition-none"
        >
          홈으로 돌아가기
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}
