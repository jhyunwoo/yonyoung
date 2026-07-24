"use client";

import type { ApiPublicGenerationWithMembers } from "@/shared/contracts/api-contracts";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  buildMemberDisplayInitial,
  buildMemberDisplayName,
} from "@/features/dashboard/members/display-name";
import { buildMemberRoleLabel } from "@/features/dashboard/members/member-role-label";

type GenerationMembersGridProps = {
  generation: Pick<
    ApiPublicGenerationWithMembers,
    "id" | "name" | "sortOrder" | "members"
  >;
};

export default function GenerationMembersGrid({
  generation,
}: GenerationMembersGridProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const selectedMember = useMemo(() => {
    if (!selectedMemberId) {
      return null;
    }
    return generation.members.find((member) => member.id === selectedMemberId) ?? null;
  }, [generation.members, selectedMemberId]);

  useEffect(() => {
    setSelectedMemberId(null);
  }, [generation.id]);

  useEffect(() => {
    if (!selectedMember) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedMemberId(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedMember]);

  const closeModal = () => {
    setSelectedMemberId(null);
  };

  const selectedMemberDisplayName = selectedMember
    ? buildMemberDisplayName(selectedMember)
    : "이름 미등록";
  const generationDisplayName = (() => {
    const trimmedName = generation.name.trim();
    const uuidLikePattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (trimmedName.length === 0 || uuidLikePattern.test(trimmedName)) {
      return `${generation.sortOrder}기`;
    }
    return trimmedName;
  })();
  const selectedMemberRoleLabel = selectedMember
    ? buildMemberRoleLabel(selectedMember.role)
    : "역할 미지정";
  const selectedMemberPersonalLink = selectedMember?.personalLink?.trim().length
    ? selectedMember.personalLink.trim()
    : null;
  const collaborationStatus = selectedMember?.collaborationAvailable
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
      <ul className="grid grid-cols-4 gap-x-3 gap-y-4 sm:grid-cols-6 md:grid-cols-8 md:gap-x-4 md:gap-y-5 lg:grid-cols-10 xl:grid-cols-12">
        {generation.members.map((member) => {
          const displayName = buildMemberDisplayName(member);
          const fallbackInitial = buildMemberDisplayInitial(displayName);
          return (
            <li key={member.id} data-testid={`about-photographers-member-${member.id}`}>
              <button
                type="button"
                className="flex w-full flex-col items-center gap-2 text-center"
                aria-label={`${displayName} 상세 정보 보기`}
                onClick={() => setSelectedMemberId(member.id)}
                data-testid={`about-photographers-member-button-${member.id}`}
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-(--surface-strong-border) bg-(--surface-muted) p-0.5 shadow-[0_0_0_1px_rgba(15,16,24,0.08)] md:h-14 md:w-14"
                  data-testid={`about-photographers-member-avatar-${member.id}`}
                >
                  <div className="relative h-full w-full overflow-hidden rounded-full bg-(--surface-border)">
                    {member.image ? (
                      <Image
                        src={member.image}
                        alt={`${displayName} 프로필`}
                        fill
                        unoptimized
                        sizes="(min-width: 768px) 56px, 48px"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-(--text-muted)">
                        {fallbackInitial}
                      </div>
                    )}
                  </div>
                </div>
                <span
                  className="text-xs font-semibold tracking-tight text-(--text-primary) md:text-sm"
                  data-testid={`about-photographers-member-name-${member.id}`}
                >
                  {displayName}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <AnimatePresence>
        {selectedMember ? (
          <motion.div
            className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/60 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-4 sm:py-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-photographers-member-modal-title"
            data-testid="about-photographers-member-modal"
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }
            }
          >
            <button
              type="button"
              data-testid="about-photographers-member-modal-close-overlay"
              className="absolute inset-0"
              onClick={closeModal}
              aria-label="사용자 정보 모달 닫기"
            />
            <motion.div
              className="relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[620px] flex-col overflow-hidden rounded-2xl border border-(--surface-border) bg-(--surface-elevated) shadow-[0_30px_80px_rgba(8,10,19,0.34)] ring-1 ring-black/5 will-change-transform sm:max-h-[calc(100dvh-4rem)]"
              data-testid="about-photographers-member-modal-card"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 28, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }
              }
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : {
                      type: "spring",
                      stiffness: 360,
                      damping: 30,
                      mass: 0.82,
                    }
              }
            >
              <div
                className="pointer-events-none absolute inset-x-16 top-2 -z-10 h-12 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(122,132,148,0.2),rgba(122,132,148,0))] blur-xl"
                aria-hidden="true"
              />
              <div className="flex shrink-0 justify-center bg-(--surface-muted) px-6 pt-8 pb-2">
                <div className="relative aspect-square w-40 overflow-hidden rounded-2xl border border-(--surface-border) bg-(--surface-border) md:w-56">
                  {selectedMember.image ? (
                    <Image
                      src={selectedMember.image}
                      alt={`${selectedMemberDisplayName} 프로필`}
                      fill
                      unoptimized
                      sizes="(min-width: 768px) 224px, 160px"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-5xl font-semibold text-(--text-muted)">
                      {buildMemberDisplayInitial(selectedMemberDisplayName)}
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
                      {selectedMemberDisplayName}
                    </h3>
                    <p className="mt-2 text-base text-(--text-secondary) sm:text-xl">
                      {generationDisplayName} · {selectedMemberRoleLabel}
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
                      {selectedMemberRoleLabel}
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
                      {selectedMemberPersonalLink ? (
                        <a
                          href={selectedMemberPersonalLink}
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
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
