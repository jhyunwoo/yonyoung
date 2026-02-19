"use client";

import AdminActionButton from "./admin-action-button";

type AdminConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  confirmLoadingText?: string;
  cancelText?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export default function AdminConfirmModal({
  open,
  title,
  description,
  confirmText = "삭제",
  confirmLoadingText = "삭제 중...",
  cancelText = "취소",
  isLoading = false,
  onConfirm,
  onClose,
}: AdminConfirmModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      data-testid="confirm-modal"
    >
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-xl">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{description}</p>

        <div className="mt-5 flex justify-end gap-2">
          <AdminActionButton
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            testId="confirm-modal-cancel"
          >
            {cancelText}
          </AdminActionButton>
          <AdminActionButton
            variant="danger"
            onClick={onConfirm}
            loading={isLoading}
            loadingText={confirmLoadingText}
            testId="confirm-modal-confirm"
          >
            {confirmText}
          </AdminActionButton>
        </div>
      </div>
    </div>
  );
}
