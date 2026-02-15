"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOutCurrentUser } from "../../../lib/auth-client-tool";

export default function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignOut = async () => {
    setErrorMessage(null);
    setIsPending(true);

    const result = await signOutCurrentUser();

    if (!result.ok) {
      setErrorMessage(result.errorMessage);
      setIsPending(false);
      return;
    }

    router.replace("/auth/sign-in");
    router.refresh();
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isPending}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "로그아웃 중..." : "로그아웃"}
      </button>

      {errorMessage ? (
        <p className="text-sm text-red-600">{errorMessage}</p>
      ) : null}
    </div>
  );
}
