import { useCallback, useMemo, useState } from 'react';
import type {
  FilterState,
  PaginationState,
  RowId,
  SortState,
} from '@/types/table';

export type EditingCell = {
  rowId: RowId;
  columnId: string;
};

export type TableState = {
  sort: SortState;
  filters: FilterState;
  pagination: PaginationState;
  editingCell: EditingCell | null;
  editedRowIds: ReadonlySet<RowId>;
};

export type TableActions = {
  setSort: (sort: SortState) => void;
  setFilter: (columnId: string, value: string) => void;
  clearFilter: (columnId: string) => void;
  clearAllFilters: () => void;
  setPageIndex: (pageIndex: number) => void;
  setPageSize: (pageSize: number) => void;
  setEditingCell: (cell: EditingCell) => void;
  clearEditingCell: () => void;
  markRowEdited: (rowId: RowId) => void;
  clearEditedRows: () => void;
};

export type UseTableStateOptions = {
  initialSort?: SortState;
  initialFilters?: FilterState;
  initialPagination?: PaginationState;
};

export type UseTableStateResult = {
  state: TableState;
  actions: TableActions;
};

const DEFAULT_PAGINATION: PaginationState = { pageIndex: 0, pageSize: 50 };
const EMPTY_FILTERS: FilterState = {};
const EMPTY_EDITED: ReadonlySet<RowId> = new Set<RowId>();

export function useTableState(
  options: UseTableStateOptions = {},
): UseTableStateResult {
  const [sort, setSortState] = useState<SortState>(options.initialSort ?? null);
  const [filters, setFiltersState] = useState<FilterState>(
    options.initialFilters ?? EMPTY_FILTERS,
  );
  const [pagination, setPaginationState] = useState<PaginationState>(
    options.initialPagination ?? DEFAULT_PAGINATION,
  );
  const [editingCell, setEditingCellState] = useState<EditingCell | null>(null);
  const [editedRowIds, setEditedRowIdsState] =
    useState<ReadonlySet<RowId>>(EMPTY_EDITED);

  const setSort = useCallback<TableActions['setSort']>((next) => {
    setSortState(next);
  }, []);

  const setFilter = useCallback<TableActions['setFilter']>(
    (columnId, value) => {
      setFiltersState((prev) => {
        if (prev[columnId] === value) return prev;
        return { ...prev, [columnId]: value };
      });
    },
    [],
  );

  const clearFilter = useCallback<TableActions['clearFilter']>((columnId) => {
    setFiltersState((prev) => {
      if (!(columnId in prev)) return prev;
      const { [columnId]: _omit, ...rest } = prev;
      void _omit;
      return rest;
    });
  }, []);

  const clearAllFilters = useCallback<TableActions['clearAllFilters']>(() => {
    setFiltersState((prev) => (Object.keys(prev).length === 0 ? prev : {}));
  }, []);

  const setPageIndex = useCallback<TableActions['setPageIndex']>(
    (pageIndex) => {
      setPaginationState((prev) =>
        prev.pageIndex === pageIndex ? prev : { ...prev, pageIndex },
      );
    },
    [],
  );

  const setPageSize = useCallback<TableActions['setPageSize']>((pageSize) => {
    setPaginationState((prev) =>
      prev.pageSize === pageSize ? prev : { pageIndex: 0, pageSize },
    );
  }, []);

  const setEditingCell = useCallback<TableActions['setEditingCell']>((cell) => {
    setEditingCellState((prev) =>
      prev !== null &&
      prev.rowId === cell.rowId &&
      prev.columnId === cell.columnId
        ? prev
        : cell,
    );
  }, []);

  const clearEditingCell = useCallback<TableActions['clearEditingCell']>(() => {
    setEditingCellState((prev) => (prev === null ? prev : null));
  }, []);

  const markRowEdited = useCallback<TableActions['markRowEdited']>((rowId) => {
    setEditedRowIdsState((prev) => {
      if (prev.has(rowId)) return prev;
      const next = new Set(prev);
      next.add(rowId);
      return next;
    });
  }, []);

  const clearEditedRows = useCallback<TableActions['clearEditedRows']>(() => {
    setEditedRowIdsState((prev) => (prev.size === 0 ? prev : new Set()));
  }, []);

  const state = useMemo<TableState>(
    () => ({ sort, filters, pagination, editingCell, editedRowIds }),
    [sort, filters, pagination, editingCell, editedRowIds],
  );

  const actions = useMemo<TableActions>(
    () => ({
      setSort,
      setFilter,
      clearFilter,
      clearAllFilters,
      setPageIndex,
      setPageSize,
      setEditingCell,
      clearEditingCell,
      markRowEdited,
      clearEditedRows,
    }),
    [
      setSort,
      setFilter,
      clearFilter,
      clearAllFilters,
      setPageIndex,
      setPageSize,
      setEditingCell,
      clearEditingCell,
      markRowEdited,
      clearEditedRows,
    ],
  );

  return { state, actions };
}
