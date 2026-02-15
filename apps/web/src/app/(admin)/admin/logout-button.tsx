"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "../../../lib/auth-client-tool";

type LogoutButtonProps = {
  compact?: boolean;
};

export default function LogoutButton({ compact = false }: LogoutButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignOut = async () => {
    setErrorMessage(null);
    setIsPending(true);

    const result = await signOut();

    if (!result.ok) {
      setErrorMessage(result.errorMessage);
      setIsPending(false);
      return;
    }

    router.replace("/auth/sign-in");
    router.refresh();
  };

  return (
    <div className={`flex w-full flex-col gap-2 ${compact ? "items-center" : "items-stretch"}`}>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isPending}
        data-testid="admin-logout-button"
        className={`rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 ${
          compact ? "w-12" : "w-full"
        }`}
      >
        {compact ? (isPending ? "..." : "OUT") : isPending ? "로그아웃 중..." : "로그아웃"}
      </button>

      {errorMessage ? (
        <p className="text-xs text-red-600" data-testid="admin-logout-error">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
