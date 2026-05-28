import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { debounce } from 'lodash-es';
import type { ValidationResult } from '@/types/table';

type EditableCellBaseProps = {
  isEditing: boolean;
  onActivate?: () => void;
  onCancel: () => void;
};

type TextEditableCellProps = EditableCellBaseProps & {
  type: 'text';
  value: string;
  onSave: (next: string) => void;
  validate?: (value: string) => ValidationResult;
};

type NumberEditableCellProps = EditableCellBaseProps & {
  type: 'number';
  value: number;
  onSave: (next: number) => void;
  validate?: (value: number) => ValidationResult;
};

export type EditableCellProps = TextEditableCellProps | NumberEditableCellProps;

type ValidateResult = { ok: true } | { ok: false; message: string };

const formatDraft = (value: string | number): string => String(value);

const VALIDATION_DEBOUNCE_MS = 150;

const validateValue = (
  type: 'text' | 'number',
  validator:
    | ((value: string) => ValidationResult)
    | ((value: number) => ValidationResult)
    | undefined,
  next: string,
): ValidateResult => {
  if (type === 'number') {
    const trimmed = next.trim();
    if (trimmed === '' || Number.isNaN(Number(trimmed))) {
      return { ok: false, message: 'Must be a number' };
    }
    if (validator) {
      const result = (validator as (v: number) => ValidationResult)(
        Number(trimmed),
      );
      return result.valid
        ? { ok: true }
        : { ok: false, message: result.message };
    }
    return { ok: true };
  }
  if (validator) {
    const result = (validator as (v: string) => ValidationResult)(next);
    return result.valid ? { ok: true } : { ok: false, message: result.message };
  }
  return { ok: true };
};

export function EditableCell(props: EditableCellProps) {
  // Draft is intentionally local to this cell. Keystrokes mutate only this
  // component's state, so no other cell, no row, and no global store
  // re-renders while typing — editing cost is O(1) regardless of table size.
  const [draft, setDraft] = useState<string>(formatDraft(props.value));
  const [error, setError] = useState<string | null>(null);

  // Reset draft + error only on the false -> true transition. Preserves
  // any in-progress draft if the parent re-renders mid-edit.
  const prevIsEditing = useRef(false);
  useEffect(() => {
    if (props.isEditing && !prevIsEditing.current) {
      setDraft(formatDraft(props.value));
      setError(null);
    }
    prevIsEditing.current = props.isEditing;
  }, [props.isEditing, props.value]);

  // Destructured outside the debounce factory so deps are scalar/function
  // values rather than property accesses on `props` (avoids the wider deps
  // warning while keeping the debounced fn closure stable across renders
  // where these values are unchanged).
  const { type, validate } = props;

  // Debounce surfacing of validation errors so fast typing doesn't flicker
  // the error UI on every keystroke. The synchronous save path
  // (handleSave) cancels the pending debounce and validates immediately so
  // committed values are never stale.
  const debouncedValidate = useMemo(
    () =>
      debounce((next: string) => {
        const result = validateValue(type, validate, next);
        setError(result.ok ? null : result.message);
      }, VALIDATION_DEBOUNCE_MS),
    [type, validate],
  );

  useEffect(
    () => () => {
      debouncedValidate.cancel();
    },
    [debouncedValidate],
  );

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setDraft(next);
    debouncedValidate(next);
  };

  const handleSave = () => {
    debouncedValidate.cancel();
    const result = validateValue(type, validate, draft);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (props.type === 'number') {
      props.onSave(Number(draft.trim()));
    } else {
      props.onSave(draft);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSave();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      props.onCancel();
    }
  };

  if (!props.isEditing) {
    const activate = props.onActivate;
    const handleClick = (event: MouseEvent<HTMLSpanElement>) => {
      if (activate) {
        event.stopPropagation();
        activate();
      }
    };
    const handleReadKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
      if (activate && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        activate();
      }
    };
    return (
      <span
        className={`block rounded px-1 py-0.5 ${
          activate ? 'cursor-pointer hover:bg-slate-100' : ''
        }`}
        onClick={handleClick}
        onKeyDown={handleReadKeyDown}
        role={activate ? 'button' : undefined}
        tabIndex={activate ? 0 : undefined}
      >
        {formatDraft(props.value)}
      </span>
    );
  }

  const borderClass = error
    ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200';

  return (
    <div className="flex flex-col gap-1">
      <input
        type={props.type === 'number' ? 'number' : 'text'}
        value={draft}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        autoFocus
        aria-invalid={error !== null}
        className={`w-full rounded border px-2 py-1 text-sm outline-none focus:ring-2 ${borderClass}`}
      />
      {error !== null && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
