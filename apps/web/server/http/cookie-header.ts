import "server-only";
import { cookies } from "next/headers";

/** 들어온 요청의 쿠키를 API로 전달할 Cookie 헤더 값으로 읽는다. 쿠키가 없으면 null. */
export const readCookieHeader = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  return cookieHeader.length > 0 ? cookieHeader : null;
};
