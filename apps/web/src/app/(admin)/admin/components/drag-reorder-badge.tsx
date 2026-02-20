"use client";

type DragReorderBadgeProps = {
  text?: string;
  className?: string;
  compact?: boolean;
};

export default function DragReorderBadge({
  text = "드래그로 순서 변경",
  className = "",
  compact = false,
}: DragReorderBadgeProps) {
  const dots = (
    <span className="grid grid-cols-2 gap-[2px]" aria-hidden>
      <span className="h-1 w-1 rounded-full bg-gray-400" />
      <span className="h-1 w-1 rounded-full bg-gray-400" />
      <span className="h-1 w-1 rounded-full bg-gray-400" />
      <span className="h-1 w-1 rounded-full bg-gray-400" />
      <span className="h-1 w-1 rounded-full bg-gray-400" />
      <span className="h-1 w-1 rounded-full bg-gray-400" />
    </span>
  );

  if (compact) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-md border border-white/70 bg-black/55 px-2 py-1 text-[11px] text-white ${className}`}
      >
        {dots}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-md border border-gray-300 bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-600 ${className}`}
    >
      {dots}
      <span>{text}</span>
    </span>
  );
}
