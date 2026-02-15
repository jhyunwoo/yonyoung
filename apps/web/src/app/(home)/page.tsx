/**
 * HomePage 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default function HomePage() {
  return (
    <div className={"w-full h-screen flex items-center justify-center p-4"}>
      <div className={"w-full max-w-4xl p-4 bg-white shadow-2xl rounded-2xl"}>
        <h1 className={"text-3xl font-bold"}>연영회</h1>
      </div>
    </div>
  );
}
