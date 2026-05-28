import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import type { ValidationResult } from '@/types/table';

type EditableCellBaseProps = {
  isEditing: boolean;
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

const formatDraft = (value: string | number): string => String(value);

export function EditableCell(props: EditableCellProps) {
  // Draft is intentionally local to this cell. Keystrokes mutate only this
  // component's state, so no other cell, no row, and no global store
  // re-renders while typing — editing cost is O(1) regardless of table size.
  const [draft, setDraft] = useState<string>(formatDraft(props.value));
  const [error, setError] = useState<string | null>(null);

  // Reset the draft only when the cell ENTERS edit mode (false -> true),
  // not on every value change. This preserves the user's in-progress
  // draft if the parent happens to re-render with the same value, and
  // avoids clobbering work mid-edit if upstream data updates arrive.
  const prevIsEditing = useRef(false);
  useEffect(() => {
    if (props.isEditing && !prevIsEditing.current) {
      setDraft(formatDraft(props.value));
      setError(null);
    }
    prevIsEditing.current = props.isEditing;
  }, [props.isEditing, props.value]);

  const runValidate = (
    next: string,
  ): { ok: true } | { ok: false; message: string } => {
    if (props.type === 'number') {
      const trimmed = next.trim();
      if (trimmed === '' || Number.isNaN(Number(trimmed))) {
        return { ok: false, message: 'Must be a number' };
      }
      if (props.validate) {
        const result = props.validate(Number(trimmed));
        return result.valid
          ? { ok: true }
          : { ok: false, message: result.message };
      }
      return { ok: true };
    }

    if (props.validate) {
      const result = props.validate(next);
      return result.valid
        ? { ok: true }
        : { ok: false, message: result.message };
    }
    return { ok: true };
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setDraft(next);
    const result = runValidate(next);
    setError(result.ok ? null : result.message);
  };

  const handleSave = () => {
    const result = runValidate(draft);
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
    return <span className="block">{formatDraft(props.value)}</span>;
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
