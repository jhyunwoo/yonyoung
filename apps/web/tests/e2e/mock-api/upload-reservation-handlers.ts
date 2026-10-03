import type { MockState } from "./contracts";

/**
 * 업로드 용량 예약 mock (server.ts 비대화 방지를 위해 분리).
 *
 * 실제 API(`apps/api/src/lib/uploads/upload-reservation.ts`)처럼 관리자 1명당 동시에 잡을 수
 * 있는 업로드 예약을 10건으로 제한하고, `/api/uploads/settle`이 오면 예약을 풀어 준다.
 * 웹이 세부 이미지를 한꺼번에 presign 하면 11번째부터 409가 나는 회귀를 e2e가 잡도록 한다.
 */
export const MOCK_UPLOAD_RESERVATION_LIMIT = 10;

const activeReservationsByState = new WeakMap<MockState, Set<string>>();

const readActiveReservations = (state: MockState): Set<string> => {
  let active = activeReservationsByState.get(state);
  if (!active) {
    active = new Set();
    activeReservationsByState.set(state, active);
  }
  return active;
};

/** 예약을 잡는다. 한도를 넘으면 null을 돌려 호출부가 409로 응답하게 한다. */
export const reserveMockUpload = (state: MockState): string | null => {
  const active = readActiveReservations(state);
  if (active.size >= MOCK_UPLOAD_RESERVATION_LIMIT) {
    return null;
  }

  const reservationId = `reservation-${crypto.randomUUID()}`;
  active.add(reservationId);
  return reservationId;
};

export const settleMockUpload = (state: MockState, reservationId: unknown): void => {
  if (typeof reservationId === "string") {
    readActiveReservations(state).delete(reservationId);
  }
};
