type DateRangeFieldsProps = {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  disabled: boolean;
};

/** 시작일·종료일 date input 한 쌍. 값은 `YYYY-MM-DD` 문자열 그대로 다룬다. */
export default function DateRangeFields({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  disabled,
}: DateRangeFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block space-y-1">
        <span className="text-sm font-semibold text-ink">시작일</span>
        <input
          type="date"
          value={startDate}
          onChange={(event) => onStartDateChange(event.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-semibold text-ink">종료일</span>
        <input
          type="date"
          value={endDate}
          onChange={(event) => onEndDateChange(event.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm"
        />
      </label>
    </div>
  );
}
