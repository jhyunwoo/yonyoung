/**
 * `scan` 을 지금 한 번 돌리고, 이후 문서에 노드가 추가될 때마다 다시 돌린다.
 * 돌려준 함수를 부르면 감시를 멈춘다.
 *
 * 문서 전체를 담당하는 아일랜드(`RevealObserver`, `ImageSkeletonObserver`)가 스트리밍으로
 * 늦게 도착하는 Suspense 콘텐츠와 클라이언트 네비게이션으로 갈아끼워지는 본문을 잡는
 * 데 쓴다. 변경이 몰려도 재스캔은 requestAnimationFrame 으로 한 프레임에 한 번만 한다.
 */
export const rescanOnDocumentChange = (scan: () => void): (() => void) => {
  let queuedFrame: number | null = null;

  const runQueuedScan = () => {
    queuedFrame = null;
    scan();
  };

  scan();

  const mutationObserver = new MutationObserver((records) => {
    if (queuedFrame !== null) {
      return;
    }
    if (records.some((record) => record.addedNodes.length > 0)) {
      queuedFrame = requestAnimationFrame(runQueuedScan);
    }
  });
  mutationObserver.observe(document.body, { childList: true, subtree: true });

  return () => {
    mutationObserver.disconnect();
    if (queuedFrame !== null) {
      cancelAnimationFrame(queuedFrame);
    }
  };
};
