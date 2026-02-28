"use client";

import type { ApiPublicGenerationWithMembers } from "@repo/shared-api-contracts";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  buildMemberDisplayInitial,
  buildMemberDisplayName,
} from "../../../../lib/member-display-name";
import { buildMemberRoleLabel } from "../../../../lib/member-role-label";

type GenerationMembersGridProps = {
  generation: Pick<ApiPublicGenerationWithMembers, "id" | "name" | "sortOrder" | "members">;
};

export default function GenerationMembersGrid({ generation }: GenerationMembersGridProps) {
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
  const selectedMemberPersonalLink =
    selectedMember?.personalLink?.trim().length
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
      <ul className="grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-3 md:grid-cols-5 md:gap-x-6 md:gap-y-8 lg:grid-cols-6 xl:grid-cols-7">
        {generation.members.map((member) => {
          const displayName = buildMemberDisplayName(member);
          const fallbackInitial = buildMemberDisplayInitial(displayName);
          return (
            <li key={member.id} data-testid={`about-photographers-member-${member.id}`}>
              <button
                type="button"
                className="flex w-full flex-col items-center gap-3 text-center md:gap-4"
                aria-label={`${displayName} 상세 정보 보기`}
                onClick={() => setSelectedMemberId(member.id)}
                data-testid={`about-photographers-member-button-${member.id}`}
              >
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-full border-[3px] border-[#2f3763] bg-[#efefef] p-1 shadow-[0_0_0_1px_rgba(15,16,24,0.08)] md:h-28 md:w-28"
                  data-testid={`about-photographers-member-avatar-${member.id}`}
                >
                  <div className="relative h-full w-full overflow-hidden rounded-full bg-[#dddddd]">
                    {member.image ? (
                      <Image
                        src={member.image}
                        alt={`${displayName} 프로필`}
                        fill
                        unoptimized
                        sizes="(min-width: 768px) 112px, 96px"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-[#8a8b93]">
                        {fallbackInitial}
                      </div>
                    )}
                  </div>
                </div>
                <span
                  className="text-base font-semibold tracking-tight text-[#101217] md:text-xl md:leading-none"
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
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm"
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
              className="absolute inset-0"
              onClick={closeModal}
              aria-label="사용자 정보 모달 닫기"
            />
            <motion.div
              className="relative z-10 w-full max-w-[620px] overflow-hidden rounded-2xl border border-(--surface-border) bg-white shadow-[0_30px_80px_rgba(8,10,19,0.34)] ring-1 ring-black/5 will-change-transform"
              data-testid="about-photographers-member-modal-card"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 28, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
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
                className="pointer-events-none absolute inset-x-16 top-2 -z-10 h-12 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(70,87,160,0.22),rgba(70,87,160,0))] blur-xl"
                aria-hidden="true"
              />
              <div className="relative h-[220px] w-full bg-(--surface-muted) md:h-[280px]">
                {selectedMember.image ? (
                  <Image
                    src={selectedMember.image}
                    alt={`${selectedMemberDisplayName} 프로필`}
                    fill
                    unoptimized
                    sizes="(min-width: 768px) 620px, 92vw"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-5xl font-semibold text-(--text-muted)">
                    {buildMemberDisplayInitial(selectedMemberDisplayName)}
                  </div>
                )}
              </div>

              <div className="p-6 md:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3
                      id="about-photographers-member-modal-title"
                      className="text-2xl font-semibold text-(--text-primary)"
                    >
                      {selectedMemberDisplayName}
                    </h3>
                    <p className="mt-2 text-xl text-(--text-secondary)">
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
                    <dd className="font-medium text-(--text-primary)">{generationDisplayName}</dd>
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
                          className="text-blue-600 underline-offset-2 hover:underline"
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
