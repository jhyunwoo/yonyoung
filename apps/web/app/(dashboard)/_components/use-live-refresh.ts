import { useEffect, useEffectEvent } from "react";

/** 갱신 시각 표시용 클라이언트 로컬 시간(HH:MM:SS). */
export const formatRefreshTime = () =>
  new Date().toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

type LiveRefreshOptions<T> = {
  /** false 면 타이머를 걸지 않는다. */
  enabled?: boolean;
  intervalMs: number;
  load: () => Promise<T>;
  onData: (data: T) => void;
  onError: (message: string) => void;
};

/**
 * intervalMs 마다 load 를 다시 불러 onData/onError 로 넘긴다.
 * 탭이 보이지 않을 때는 건너뛰고, 언마운트 뒤에 도착한 응답은 버린다.
 */
export function useLiveRefresh<T>({
  enabled = true,
  intervalMs,
  load,
  onData,
  onError,
}: LiveRefreshOptions<T>) {
  const loadLatest = useEffectEvent(load);
  const handleData = useEffectEvent(onData);
  const handleError = useEffectEvent(onError);

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    const refresh = async () => {
      // 아무도 보지 않는 탭까지 DB를 두드리지 않게 한다.
      if (document.visibilityState !== "visible") return;
      try {
        const data = await loadLatest();
        if (active) handleData(data);
      } catch (err) {
        if (active) {
          handleError(
            err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
          );
        }
      }
    };

    const timer = setInterval(() => void refresh(), intervalMs);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [enabled, intervalMs]);
}
