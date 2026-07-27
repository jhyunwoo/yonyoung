/**
 * 대시보드 UI 프리미티브 배럴.
 *
 * 호출부는 여기서만 가져온다 — 인라인 Tailwind 문자열을 새로 쓰기 전에
 * 이 목록에 맞는 프리미티브가 있는지 먼저 확인할 것.
 */

export { Alert, type AlertTone } from "@/app/(dashboard)/_components/ui/alert";
export { Avatar } from "@/app/(dashboard)/_components/ui/avatar";
export { Badge, type BadgeTone } from "@/app/(dashboard)/_components/ui/badge";
export { Button } from "@/app/(dashboard)/_components/ui/button";
export { ButtonLink } from "@/app/(dashboard)/_components/ui/button-link";
export {
  buildButtonClass,
  buildIconButtonClass,
  type ButtonSize,
  type ButtonVariant,
} from "@/app/(dashboard)/_components/ui/button-styles";
export {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
} from "@/app/(dashboard)/_components/ui/card";
export {
  ConfirmProvider,
  useConfirm,
  type ConfirmOptions,
} from "@/app/(dashboard)/_components/ui/confirm-provider";
export { cx, type ClassValue } from "@/app/(dashboard)/_components/ui/cx";
export { Dialog } from "@/app/(dashboard)/_components/ui/dialog";
export { EmptyState } from "@/app/(dashboard)/_components/ui/empty-state";
export { Field, type FieldControlProps } from "@/app/(dashboard)/_components/ui/field";
export { IconButton } from "@/app/(dashboard)/_components/ui/icon-button";
export { Input, Select, Textarea } from "@/app/(dashboard)/_components/ui/input";
export {
  PageContainer,
  SkipLink,
  StickyActionBar,
} from "@/app/(dashboard)/_components/ui/layout-parts";
export { PageHeader } from "@/app/(dashboard)/_components/ui/page-header";
export { Pagination } from "@/app/(dashboard)/_components/ui/pagination";
export {
  SegmentedControl,
  type SegmentedOption,
} from "@/app/(dashboard)/_components/ui/segmented-control";
export {
  CardSkeleton,
  FormSkeleton,
  GridSkeleton,
  ListSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
} from "@/app/(dashboard)/_components/ui/skeletons";
export { StatTile } from "@/app/(dashboard)/_components/ui/stat-tile";
export {
  resolveStickerAccent,
  stickerDotClass,
  stickerTileClass,
  STICKER_ACCENTS,
  type StickerAccent,
} from "@/app/(dashboard)/_components/ui/sticker";
export { ThemeToggle } from "@/app/(dashboard)/_components/ui/theme-toggle";
export {
  ToastProvider,
  useToast,
  type ToastOptions,
  type ToastTone,
} from "@/app/(dashboard)/_components/ui/toast-provider";
export { useFocusTrap } from "@/app/(dashboard)/_components/ui/use-focus-trap";
