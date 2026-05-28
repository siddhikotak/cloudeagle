import { useRef, useState, type KeyboardEvent, type FocusEvent } from 'react';
import type { EditOption, ValidationResult } from '@/types/table';

type EditableSelectCellProps<TValue extends string | number> = {
  value: TValue;
  isEditing: boolean;
  options: ReadonlyArray<EditOption<TValue>>;
  onActivate?: () => void;
  onSave: (next: TValue) => void;
  onCancel: () => void;
  validate?: (value: TValue) => ValidationResult;
};

export function EditableSelectCell<TValue extends string | number>({
  value,
  isEditing,
  options,
  onActivate,
  onSave,
  onCancel,
  validate,
}: EditableSelectCellProps<TValue>) {
  const [error, setError] = useState<string | null>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const option = options.find((item) => item.value === value);

  const commit = (next: TValue): boolean => {
    const result = validate?.(next);
    if (result && !result.valid) {
      setError(result.message);
      return false;
    }

    onSave(next);
    return true;
  };

  const currentSelectValue = (): TValue =>
    (selectRef.current?.value ?? String(value)) as TValue;

  const handleBlur = (event: FocusEvent<HTMLSelectElement>) => {
    const next = event.currentTarget.value as TValue;
    const didSave = commit(next);
    if (!didSave) {
      window.requestAnimationFrame(() => {
        selectRef.current?.focus();
      });
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLSelectElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit(currentSelectValue());
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  };

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={onActivate}
        className="w-full rounded border border-transparent bg-transparent px-2 py-1 text-left text-sm text-slate-700 transition hover:border-slate-200 hover:bg-white focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
      >
        {option?.label ?? String(value)}
      </button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-1">
      <select
        ref={selectRef}
        defaultValue={String(value)}
        onFocus={() => setError(null)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
        aria-invalid={error !== null}
        className={`w-full appearance-none rounded border bg-white px-2 py-1 text-sm outline-none focus:ring-2 ${
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
            : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200'
        }`}
      >
        {options.map((item) => (
          <option key={String(item.value)} value={String(item.value)}>
            {item.label}
          </option>
        ))}
      </select>
      {error !== null && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
