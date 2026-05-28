import { debounce } from 'lodash-es';
import type { ColumnDef, ColumnDefs, FilterState, RowId } from '@/types/table';

// Default per-column matcher: case-insensitive substring match on the
// stringified value. An empty filter string matches everything (a cleared
// filter is the same as no filter on that column).
export const defaultFilterMatches = (
  value: unknown,
  filter: string,
): boolean => {
  if (filter === '') return true;
  if (value === null || value === undefined) return false;
  return String(value).toLowerCase().includes(filter.toLowerCase());
};

// Filter rows by per-column filters AND an optional global search.
// A row passes only when:
//   - the global search (if any) matches at least one filterable column, AND
//   - every active per-column filter matches.
// Columns can override the default matcher via column.filterFn. Columns
// with `filterable: false` are skipped for both global search and any
// per-column filter that may have been set on them.
export const filterRows = <TRow extends { id: RowId }>(
  rows: ReadonlyArray<TRow>,
  filters: FilterState,
  columns: ColumnDefs<TRow>,
  globalSearch = '',
): TRow[] => {
  const trimmedSearch = globalSearch.trim();
  const hasGlobalSearch = trimmedSearch !== '';

  // Resolve active per-column filters once. Re-finding on every row would
  // be O(c) extra work scaled by n — wasteful at 10k rows.
  const activeColumnFilters = Object.entries(filters)
    .filter(([, value]) => value !== '')
    .flatMap(([columnId, filter]) => {
      const column = columns.find(
        (c) => (c as ColumnDef<TRow, keyof TRow>).id === columnId,
      ) as ColumnDef<TRow, keyof TRow> | undefined;
      if (!column || column.filterable === false) return [];
      return [{ filter, column }];
    });

  if (!hasGlobalSearch && activeColumnFilters.length === 0) {
    return rows.slice();
  }

  // Resolve searchable columns once for global search.
  const searchableColumns: Array<ColumnDef<TRow, keyof TRow>> = hasGlobalSearch
    ? columns.flatMap((column) => {
        const c = column as ColumnDef<TRow, keyof TRow>;
        return c.filterable === false ? [] : [c];
      })
    : [];

  const lowerSearch = trimmedSearch.toLowerCase();

  return rows.filter((row) => {
    if (hasGlobalSearch) {
      const matched = searchableColumns.some((c) => {
        const value = row[c.accessor];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(lowerSearch);
      });
      if (!matched) return false;
    }
    for (const { filter, column } of activeColumnFilters) {
      const value = row[column.accessor];
      const ok = column.filterFn
        ? column.filterFn(value, filter)
        : defaultFilterMatches(value, filter);
      if (!ok) return false;
    }
    return true;
  });
};

// Debounce wrapper: returns a debounced function that performs the full
// filter pipeline and calls onResult with the filtered rows. Use this to
// wire search / filter inputs without re-filtering on every keystroke at
// the cost of a small delay.
//
// Usage:
//   const apply = useMemo(
//     () => createDebouncedFilter(setFilteredRows, 200),
//     [setFilteredRows],
//   );
//   // later: apply({ rows, filters, columns, globalSearch });
//   // on unmount: apply.cancel();
export type DebouncedFilterParams<TRow> = {
  rows: ReadonlyArray<TRow>;
  filters: FilterState;
  columns: ColumnDefs<TRow>;
  globalSearch?: string;
};

export const createDebouncedFilter = <TRow extends { id: RowId }>(
  onResult: (rows: TRow[]) => void,
  waitMs = 200,
) =>
  debounce((params: DebouncedFilterParams<TRow>) => {
    onResult(
      filterRows(
        params.rows,
        params.filters,
        params.columns,
        params.globalSearch,
      ),
    );
  }, waitMs);
