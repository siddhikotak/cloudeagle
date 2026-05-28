import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import type { EditOption, ValidationResult } from '@/types/table';

type Position = {
  top: number;
  left: number;
  width: number;
};

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
  const [activeIndex, setActiveIndex] = useState<number>(() =>
    Math.max(
      options.findIndex((o) => o.value === value),
      0,
    ),
  );
  const [menuPosition, setMenuPosition] = useState<Position | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const selectedLabel = options.find((item) => item.value === value)?.label;

  const commit = (next: TValue): boolean => {
    const result = validate?.(next);
    if (result && !result.valid) {
      setError(result.message);
      return false;
    }
    onSave(next);
    return true;
  };

  // Measure the trigger and position the portaled list with position: fixed.
  // On scroll/resize, RE-measure so the menu follows its anchor (rather
  // than closing on the first scroll event). Close only when the trigger
  // has actually left the viewport — at that point a floating menu with
  // no visible anchor would just be confusing.
  //
  // Scroll listener uses the capture phase because scroll events don't
  // bubble: a bubble-phase listener on window would miss scrolls from the
  // table's inner scroll container.
  useEffect(() => {
    if (!isEditing) {
      // Clear stale coords so a future re-open of this same cell doesn't
      // briefly render the portal at the previous trigger's position
      // before the measure pass below runs again.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMenuPosition(null);
      return;
    }
    const measure = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const offscreen =
        rect.bottom <= 0 ||
        rect.top >= window.innerHeight ||
        rect.right <= 0 ||
        rect.left >= window.innerWidth;
      if (offscreen) {
        onCancel();
        return;
      }
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [isEditing, onCancel]);

  // Outside-click detection. The portaled <ul> is NOT a descendant of the
  // cell's DOM subtree, so we explicitly include listRef alongside
  // triggerRef — otherwise clicking an option would register as "outside"
  // and cancel before the option's onClick fires.
  useEffect(() => {
    if (!isEditing) return;
    const handleMouseDown = (event: globalThis.MouseEvent) => {
      const target = event.target as Node;
      const insideTrigger = triggerRef.current?.contains(target) ?? false;
      const insideList = listRef.current?.contains(target) ?? false;
      if (!insideTrigger && !insideList) {
        onCancel();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isEditing, onCancel]);

  // Focus the list so keyboard navigation works without a tab.
  useEffect(() => {
    if (!isEditing) return;
    listRef.current?.focus();
  }, [isEditing]);

  // Keep the active option scrolled into view as the user arrows.
  useEffect(() => {
    if (!isEditing) return;
    const list = listRef.current;
    if (!list) return;
    const item = list.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isEditing]);

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onActivate) return;
    if (
      event.key === 'Enter' ||
      event.key === ' ' ||
      event.key === 'ArrowDown'
    ) {
      event.preventDefault();
      onActivate();
    }
  };

  const handleListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, options.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(options.length - 1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) commit(option.value);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  };

  if (!isEditing) {
    return (
      <div
        onClick={onActivate}
        onKeyDown={handleTriggerKeyDown}
        tabIndex={onActivate ? 0 : undefined}
        role={onActivate ? 'button' : undefined}
        className="flex w-full items-center justify-between gap-2 rounded border border-transparent px-2 py-1 text-left text-sm text-slate-700 outline-none transition hover:border-slate-300 focus-visible:border-blue-300 focus-visible:ring-2 focus-visible:ring-blue-100"
      >
        <span className="truncate">{selectedLabel ?? String(value)}</span>
        {onActivate ? <ChevronIcon /> : null}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-1">
      <div
        ref={triggerRef}
        className={`flex w-full items-center justify-between gap-2 rounded border px-2 py-1 text-left text-sm text-slate-700 ${
          error
            ? 'border-red-500 ring-2 ring-red-200'
            : 'border-blue-400 ring-2 ring-blue-100'
        }`}
      >
        <span className="truncate">{selectedLabel ?? String(value)}</span>
        <ChevronIcon />
      </div>
      {error !== null ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {menuPosition !== null
        ? createPortal(
            <ul
              ref={listRef}
              role="listbox"
              tabIndex={-1}
              onKeyDown={handleListKeyDown}
              style={{
                position: 'fixed',
                top: menuPosition.top,
                left: menuPosition.left,
                width: menuPosition.width,
              }}
              className="z-50 max-h-60 overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg outline-none"
            >
              {options.map((option, index) => {
                const isSelected = option.value === value;
                const isActive = index === activeIndex;
                return (
                  <li
                    key={String(option.value)}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => commit(option.value)}
                    className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm transition ${
                      isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                    } ${isSelected ? 'font-semibold' : ''}`}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    ) : null}
                  </li>
                );
              })}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4 shrink-0 text-slate-400"
    >
      <path d="M5.5 7.5 10 12l4.5-4.5H5.5Z" />
    </svg>
  );
}
