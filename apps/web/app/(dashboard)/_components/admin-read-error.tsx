import type { AdminReadError } from "@/features/dashboard/services/admin-read-service";

const MESSAGE_BY_REASON: Record<AdminReadError["reason"], string> = {
  unauthorized: "로그인이 만료되었습니다. 다시 로그인해 주세요.",
  forbidden: "이 데이터를 볼 권한이 없습니다.",
  not_found: "요청한 데이터를 찾을 수 없습니다.",
  invalid_response: "서버 응답 형식이 예상과 달라 표시할 수 없습니다.",
  request_failed: "데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
};

/**
 * "데이터가 없음"과 "불러오지 못함"은 다른 상태다.
 * 실패를 빈 목록으로 렌더링하면 사용자가 잘못된 결론을 내리므로 따로 보여 준다.
 */
export default function AdminReadErrorNotice({
  error,
  className,
}: {
  error: AdminReadError;
  className?: string;
}) {
  return (
    <p
      className={
        className ??
        "mt-6 rounded-lg border border-danger-hairline bg-danger-soft px-4 py-6 text-sm text-danger-text"
      }
      data-testid="admin-read-error"
      role="status"
    >
      {MESSAGE_BY_REASON[error.reason]}
    </p>
  );
}
