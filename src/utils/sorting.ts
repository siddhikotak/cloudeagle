import type {
  ColumnDef,
  ColumnDefs,
  RowId,
  SortDirection,
  SortState,
} from '@/types/table';

export type SortSpec = {
  columnId: string;
  direction: SortDirection;
};

// Default comparator used when a column doesn't provide its own sortFn.
// Handles common primitives + Date; null/undefined always sort to the end
// regardless of direction so empty cells stay grouped together.
export const defaultCompare = (a: unknown, b: unknown): number => {
  const aMissing = a === null || a === undefined;
  const bMissing = b === null || b === undefined;
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;

  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b);
  }
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return Number(a) - Number(b);
  }
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }
  return String(a).localeCompare(String(b));
};

// Sort rows by an ordered list of column specs (multi-column).
// Earlier specs take priority; ties fall through to the next spec.
// Array.prototype.sort is stable in ES2019+, so equal rows keep their
// original relative order — important for predictable UX with partial
// sorts and for a no-flicker view when re-sorting on the same key.
export const sortRows = <TRow extends { id: RowId }>(
  rows: ReadonlyArray<TRow>,
  specs: ReadonlyArray<SortSpec>,
  columns: ColumnDefs<TRow>,
): TRow[] => {
  if (specs.length === 0) return rows.slice();

  // Resolve specs to columns once up front. find() per comparison would be
  // O(c) extra work scaled by n log n — wasteful at 10k rows.
  const resolved = specs.flatMap((spec) => {
    const column = columns.find(
      (c) => (c as ColumnDef<TRow, keyof TRow>).id === spec.columnId,
    ) as ColumnDef<TRow, keyof TRow> | undefined;
    return column ? [{ spec, column }] : [];
  });

  if (resolved.length === 0) return rows.slice();

  return rows.slice().sort((a, b) => {
    for (const { spec, column } of resolved) {
      const av = a[column.accessor];
      const bv = b[column.accessor];
      const cmp = column.sortFn
        ? column.sortFn(av, bv)
        : defaultCompare(av, bv);
      if (cmp !== 0) {
        return spec.direction === 'asc' ? cmp : -cmp;
      }
    }
    return 0;
  });
};

// Convert the current single-column SortState into a spec array suitable
// for sortRows. Returns [] when no sort is active.
export const toSortSpecs = (state: SortState): SortSpec[] =>
  state === null ? [] : [state];
