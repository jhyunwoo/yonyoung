"use client";

import Image from "next/image";
import {
  useEffect,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { useResetOnChange } from "@/shared/react/use-reset-on-change";
import { useMountTransition } from "@/shared/react/use-mount-transition";
import { shouldUseUnoptimizedImage } from "@/features/media/images/image-utils";
import { useBodyScrollLock } from "@/app/(home)/_components/hooks/use-body-scroll-lock";

/** 모달 퇴장 시간 — globals.css 의 `.photographer-modal-*` 전환과 같아야 한다. */
const MODAL_EXIT_MS = 200;

/** 모달이 보여 줄 멤버 정보. 표시용 값은 서버(`GenerationMembersGrid`)에서 만들어 온다. */
export type PhotographerDetail = {
  id: string;
  image: string | null;
  displayName: string;
  initial: string;
  roleLabel: string;
  personalLink: string | null;
  collaborationAvailable: boolean;
};

type GenerationMembersControllerProps = {
  generationId: string;
  generationDisplayName: string;
  members: PhotographerDetail[];
  /** 서버에서 그린 `<li>` 멤버 타일들 */
  children: ReactNode;
};

const readMemberId = (target: EventTarget | null): string | null => {
  if (!(target instanceof Element)) {
    return null;
  }
  const button = target.closest("[data-member-id]");
  return button instanceof HTMLElement ? (button.dataset.memberId ?? null) : null;
};

/**
 * 사진가 그리드의 상호작용 담당 — 기수 하나에 이 컴포넌트 하나만 하이드레이션된다.
 *
 * 타일은 서버 HTML 이므로 `<ul>` 한 곳에서 클릭을 위임으로 받아 상세 모달을 연다.
 */
export function GenerationMembersController({
  generationId,
  generationDisplayName,
  members,
  children,
}: GenerationMembersControllerProps) {
  // 닫아도 id 는 지우지 않는다 — 퇴장 애니메이션 동안 같은 멤버가 그대로 보여야 한다.
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const displayedMember = selectedMemberId
    ? (members.find((member) => member.id === selectedMemberId) ?? null)
    : null;

  // 닫히는 동안에도 마운트를 유지해 퇴장 애니메이션이 보이게 한다(AnimatePresence 대체).
  const isModalVisible = isModalOpen && displayedMember !== null;
  const { isMounted: isModalMounted, state: modalState } = useMountTransition(
    isModalVisible,
    MODAL_EXIT_MS,
  );

  // 다른 기수를 보여 주기 시작하면 열려 있던 멤버 상세를 닫는다.
  useResetOnChange(generationId, () => setIsModalOpen(false));

  useBodyScrollLock(isModalVisible);

  useEffect(() => {
    if (!isModalVisible) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsModalOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isModalVisible]);

  // React 의 위임 핸들러를 쓴다. 하이드레이션 중의 클릭도 재생되며, effect 에서 붙인
  // 네이티브 리스너는 그 클릭을 잃는다(`PhotoGalleryController` 와 같은 이유).
  const onClick = (event: ReactMouseEvent<HTMLUListElement>) => {
    const memberId = readMemberId(event.target);
    if (memberId !== null) {
      setSelectedMemberId(memberId);
      setIsModalOpen(true);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const collaborationStatus = displayedMember?.collaborationAvailable
    ? {
        label: "가능",
        badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
        dotClassName: "bg-emerald-500",
      }
    : {
        label: "불가",
        badgeClassName: "border-rose-200 bg-rose-50 text-rose-700",
        dotClassName: "bg-rose-500",
      };

  return (
    <>
      <ul
        onClick={onClick}
        className="grid grid-cols-4 gap-x-3 gap-y-4 sm:grid-cols-6 md:grid-cols-8 md:gap-x-4 md:gap-y-5 lg:grid-cols-10 xl:grid-cols-12"
      >
        {children}
      </ul>

      {isModalMounted && displayedMember ? (
        <div
          className="photographer-modal-overlay fixed inset-0 z-[1100] flex items-end justify-center bg-black/60 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4 sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="about-photographers-member-modal-title"
          data-testid="about-photographers-member-modal"
          data-state={modalState}
        >
          <button
            type="button"
            data-testid="about-photographers-member-modal-close-overlay"
            className="absolute inset-0"
            onClick={closeModal}
            aria-label="사용자 정보 모달 닫기"
          />
          <div
            className="photographer-modal-card relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[620px] flex-col overflow-hidden rounded-2xl border border-(--surface-border) bg-(--surface-elevated) shadow-[0_30px_80px_rgba(8,10,19,0.34)] ring-1 ring-black/5 will-change-transform sm:max-h-[calc(100dvh-4rem)]"
            data-testid="about-photographers-member-modal-card"
            data-state={modalState}
          >
            <div
              className="pointer-events-none absolute inset-x-16 top-2 -z-10 h-12 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(122,132,148,0.2),rgba(122,132,148,0))] blur-xl"
              aria-hidden="true"
            />
            <div className="flex shrink-0 justify-center bg-(--surface-muted) px-6 pt-8 pb-2">
              <div
                className="relative aspect-square w-40 overflow-hidden rounded-2xl border border-(--surface-border) bg-(--surface-border) md:w-56"
                data-image-skeleton={displayedMember.image ? "" : undefined}
                suppressHydrationWarning
              >
                {displayedMember.image ? (
                  <Image
                    src={displayedMember.image}
                    alt={`${displayedMember.displayName} 프로필`}
                    fill
                    unoptimized={shouldUseUnoptimizedImage(displayedMember.image)}
                    sizes="(min-width: 768px) 224px, 160px"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-5xl font-semibold text-(--text-muted)">
                    {displayedMember.initial}
                  </div>
                )}
              </div>
            </div>

            <div
              className="overflow-y-auto overscroll-contain p-5 sm:p-6 md:p-8"
              data-testid="about-photographers-member-modal-content"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3
                    id="about-photographers-member-modal-title"
                    className="text-xl font-semibold text-(--text-primary) sm:text-2xl"
                  >
                    {displayedMember.displayName}
                  </h3>
                  <p className="mt-2 text-base text-(--text-secondary) sm:text-xl">
                    {generationDisplayName} · {displayedMember.roleLabel}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-(--surface-border) px-3 py-1.5 text-sm text-(--text-primary)"
                  onClick={closeModal}
                  data-testid="about-photographers-member-modal-close"
                >
                  닫기
                </button>
              </div>

              <dl className="mt-8 border-t border-(--surface-border) text-sm">
                <div className="flex items-center justify-between gap-3 border-b border-(--surface-border) py-4">
                  <dt className="text-(--text-muted)">기수</dt>
                  <dd className="font-medium text-(--text-primary)">
                    {generationDisplayName}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-(--surface-border) py-4">
                  <dt className="text-(--text-muted)">역할</dt>
                  <dd className="font-medium text-(--text-primary)">
                    {displayedMember.roleLabel}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-(--surface-border) py-4">
                  <dt className="text-(--text-muted)">협업 가능 여부</dt>
                  <dd className="font-medium text-(--text-primary)">
                    <span
                      className={[
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                        collaborationStatus.badgeClassName,
                      ]
                        .join(" ")
                        .trim()}
                      data-testid="about-photographers-member-collaboration-status"
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${collaborationStatus.dotClassName}`}
                        aria-hidden="true"
                      />
                      {collaborationStatus.label}
                    </span>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-(--surface-border) py-4">
                  <dt className="text-(--text-muted)">개인 링크</dt>
                  <dd className="font-medium text-(--text-primary)">
                    {displayedMember.personalLink ? (
                      <a
                        href={displayedMember.personalLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-(--text-primary) underline underline-offset-2"
                      >
                        바로가기
                      </a>
                    ) : (
                      "미등록"
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
