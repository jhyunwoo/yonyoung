import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

import { ConfirmProvider } from "@/app/(dashboard)/_components/ui/confirm-provider";
import { ToastProvider } from "@/app/(dashboard)/_components/ui/toast-provider";

/**
 * 대시보드 컴포넌트 테스트용 렌더 헬퍼.
 *
 * DashboardShell 이 실제로 감싸는 프로바이더를 동일하게 제공한다.
 * useConfirm()/useToast() 를 쓰는 컴포넌트는 이 헬퍼로 렌더해야 한다.
 */
const DashboardProviders = ({ children }: { children: ReactNode }) => (
  <ToastProvider>
    <ConfirmProvider>{children}</ConfirmProvider>
  </ToastProvider>
);

export const renderWithDashboardProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
): RenderResult => render(ui, { wrapper: DashboardProviders, ...options });
