"use client";

import { authClient } from "@yonyoung/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleGoogleLogin = async () => {
    setIsPending(true);
    setError(null);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/admin"
      });
      router.push("/admin");
    } catch {
      setError("Google 로그인에 실패했습니다.");
    } finally {
      setIsPending(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setIsPending(true);
    setError(null);

    try {
      const clientAny = authClient as unknown as {
        signIn: {
          passkey?: (input: { callbackURL?: string }) => Promise<unknown>;
        };
      };

      if (!clientAny.signIn.passkey) {
        setError("Passkey 기능이 아직 준비되지 않았습니다.");
        return;
      }

      await clientAny.signIn.passkey({ callbackURL: "/admin" });
      router.push("/admin");
    } catch {
      setError("Passkey 로그인에 실패했습니다.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-6 py-32">
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">관리자 로그인</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Google 계정 또는 Passkey로 로그인하세요.</p>

        <div className="mt-8 space-y-3">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isPending}
            className="w-full rounded-lg border border-[var(--border-color)] px-4 py-3 text-sm font-medium"
          >
            Google로 로그인
          </button>

          <button
            type="button"
            onClick={handlePasskeyLogin}
            disabled={isPending}
            className="w-full rounded-lg bg-[var(--primary-color)] px-4 py-3 text-sm font-medium text-white"
          >
            Passkey로 로그인
          </button>
        </div>

        {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}
      </div>
    </div>
  );
}
