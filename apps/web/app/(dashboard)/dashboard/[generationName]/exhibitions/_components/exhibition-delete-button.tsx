"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import { readExhibitionErrorMessage } from "@/app/(dashboard)/dashboard/[generationName]/exhibitions/_components/exhibition-shared";
import { useConfirm } from "@/app/(dashboard)/_components/ui/confirm-provider";

type ExhibitionDeleteButtonProps = {
  exhibitionId: string;
  generationPath: string;
};

export default function ExhibitionDeleteButton({
  exhibitionId,
  generationPath,
}: ExhibitionDeleteButtonProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDelete = async () => {
    if (isDeleting) {
      return;
    }

    const confirmed = await confirm({
      title: "정말 이 전시를 삭제하시겠습니까?",
      description: "전시에 등록된 이미지와 첨부파일도 함께 삭제되며 되돌릴 수 없습니다.",
      confirmLabel: "삭제",
      tone: "danger",
    });
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await adminResourceApi.deleteExhibition(exhibitionId);
      router.push(`${generationPath}/exhibitions`);
    } catch (error) {
      setErrorMessage(readExhibitionErrorMessage(error));
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        data-testid="generation-exhibition-delete"
        onClick={() => void handleDelete()}
        disabled={isDeleting}
        className="rounded-lg border border-danger-hairline px-4 py-2 text-sm font-semibold text-danger-text transition hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isDeleting ? "삭제 중..." : "삭제"}
      </button>
      {errorMessage ? (
        <p
          role="alert"
          className="basis-full rounded-lg border border-danger-hairline bg-danger-soft px-4 py-3 text-sm text-danger-text"
        >
          {errorMessage}
        </p>
      ) : null}
    </>
  );
}
