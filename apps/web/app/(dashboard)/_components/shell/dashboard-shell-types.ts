/** 셸 하위 컴포넌트가 공유하는 타입. 순환 import 를 피하려고 별도 파일에 둔다. */
export type DashboardViewer = {
  id: string;
  displayName: string;
  email: string;
  image: string | null;
  role: string | null;
};
