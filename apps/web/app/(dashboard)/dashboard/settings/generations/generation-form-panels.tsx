"use client";

import FormSubmitButton from "@/app/(dashboard)/_components/form-submit-button";
import { Button } from "@/app/(dashboard)/_components/ui/button";
import { buildButtonClass } from "@/app/(dashboard)/_components/ui/button-styles";
import { Field } from "@/app/(dashboard)/_components/ui/field";
import { Input } from "@/app/(dashboard)/_components/ui/input";

/**
 * 기수 생성 / 수정 패널.
 *
 * generation-management-client.tsx 에서 분리했다. 두 폼의 입력 항목이 완전히
 * 같아서 GenerationFormFields 하나를 공유한다 — 이전에는 같은 마크업이 두 번
 * 복사돼 있었다.
 */

type GenerationFormValues = {
  name: string;
  sortOrder: string;
  startDate: string;
  endDate: string;
};

type GenerationFormFieldsProps = {
  values: GenerationFormValues;
  onChange: (key: keyof GenerationFormValues, value: string) => void;
  disabled: boolean;
  namePlaceholder?: string;
  sortOrderPlaceholder?: string;
};

const GenerationFormFields = ({
  values,
  onChange,
  disabled,
  namePlaceholder,
  sortOrderPlaceholder,
}: GenerationFormFieldsProps) => (
  <>
    <Field label="기수 이름">
      {(control) => (
        <Input
          {...control}
          value={values.name}
          onChange={(event) => onChange("name", event.target.value)}
          disabled={disabled}
          placeholder={namePlaceholder}
        />
      )}
    </Field>

    <Field label="정렬 순서" hint="숫자가 클수록 목록 위쪽에 표시됩니다.">
      {(control) => (
        <Input
          {...control}
          type="number"
          inputMode="numeric"
          value={values.sortOrder}
          onChange={(event) => onChange("sortOrder", event.target.value)}
          disabled={disabled}
          placeholder={sortOrderPlaceholder}
        />
      )}
    </Field>

    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="시작일">
        {(control) => (
          <Input
            {...control}
            type="date"
            value={values.startDate}
            onChange={(event) => onChange("startDate", event.target.value)}
            disabled={disabled}
          />
        )}
      </Field>
      <Field label="종료일">
        {(control) => (
          <Input
            {...control}
            type="date"
            value={values.endDate}
            onChange={(event) => onChange("endDate", event.target.value)}
            disabled={disabled}
          />
        )}
      </Field>
    </div>
  </>
);

export const GenerationCreatePanel = ({
  values,
  onChange,
  onSubmit,
  disabled,
}: {
  values: GenerationFormValues;
  onChange: (key: keyof GenerationFormValues, value: string) => void;
  onSubmit: () => void | Promise<void>;
  disabled: boolean;
}) => (
  <article className="rounded-lg border border-hairline p-4">
    <h2 className="text-title text-ink">기수 생성</h2>
    <form className="mt-4 space-y-4" action={onSubmit}>
      <GenerationFormFields
        values={values}
        onChange={onChange}
        disabled={disabled}
        namePlaceholder="예: 60기"
        sortOrderPlaceholder="예: 60"
      />
      <FormSubmitButton
        data-testid="generation-create-submit"
        disabled={disabled}
        className={buildButtonClass({ variant: "primary" })}
        idleLabel="기수 생성"
        pendingLabel="생성 중..."
      />
    </form>
  </article>
);

export const GenerationEditPanel = ({
  hasSelection,
  values,
  onChange,
  onSubmit,
  onDelete,
  disabled,
}: {
  hasSelection: boolean;
  values: GenerationFormValues;
  onChange: (key: keyof GenerationFormValues, value: string) => void;
  onSubmit: () => void | Promise<void>;
  onDelete: () => void;
  disabled: boolean;
}) => (
  <article className="rounded-lg border border-hairline p-4">
    <h2 className="text-title text-ink">선택한 기수 수정/삭제</h2>
    {!hasSelection ? (
      <p className="mt-3 text-body-sm text-ink-muted">
        수정할 기수를 먼저 선택해 주세요.
      </p>
    ) : (
      <form className="mt-4 space-y-4" action={onSubmit}>
        <GenerationFormFields values={values} onChange={onChange} disabled={disabled} />

        <div className="flex flex-wrap gap-2">
          <FormSubmitButton
            data-testid="generation-update-submit"
            disabled={disabled}
            className={buildButtonClass({ variant: "primary" })}
            idleLabel="기수 수정"
            pendingLabel="저장 중..."
          />
          <Button
            data-testid="generation-delete-button"
            variant="danger-ghost"
            onClick={onDelete}
            disabled={disabled}
          >
            기수 삭제
          </Button>
        </div>
      </form>
    )}
  </article>
);
