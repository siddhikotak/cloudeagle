import { useCallback, useEffect, useMemo, useReducer } from 'react';
import type { RowId } from '@/types/table';

type CellEdit<TRow extends { id: RowId }, K extends keyof TRow = keyof TRow> = {
  rowId: RowId;
  accessor: K;
  previousValue: TRow[K];
  nextValue: TRow[K];
};

type UndoRedoState<TRow extends { id: RowId }> = {
  rows: ReadonlyArray<TRow>;
  originalRowsById: ReadonlyMap<RowId, TRow>;
  past: ReadonlyArray<CellEdit<TRow>>;
  future: ReadonlyArray<CellEdit<TRow>>;
  changedCellsByRow: ReadonlyMap<RowId, ReadonlySet<keyof TRow>>;
};

type UndoRedoAction<TRow extends { id: RowId }> =
  | { type: 'reset'; rows: ReadonlyArray<TRow> }
  | { type: 'syncRows'; rows: ReadonlyArray<TRow> }
  | { type: 'commit'; edit: CellEdit<TRow>; historyLimit: number }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'clearHistory' };

type UseUndoRedoOptions<TRow extends { id: RowId }> = {
  rows: ReadonlyArray<TRow>;
  historyLimit?: number;
};

export type UseUndoRedoResult<TRow extends { id: RowId }> = {
  rows: ReadonlyArray<TRow>;
  editedRowIds: ReadonlySet<RowId>;
  canUndo: boolean;
  canRedo: boolean;
  commitCellEdit: <K extends keyof TRow>(
    rowId: RowId,
    accessor: K,
    nextValue: TRow[K],
  ) => boolean;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
};

const DEFAULT_HISTORY_LIMIT = 100;

const createOriginalRowsById = <TRow extends { id: RowId }>(
  rows: ReadonlyArray<TRow>,
): ReadonlyMap<RowId, TRow> => new Map(rows.map((row) => [row.id, row]));

const createState = <TRow extends { id: RowId }>(
  rows: ReadonlyArray<TRow>,
): UndoRedoState<TRow> => ({
  rows,
  originalRowsById: createOriginalRowsById(rows),
  past: [],
  future: [],
  changedCellsByRow: new Map(),
});

const updateRowValue = <TRow extends { id: RowId }, K extends keyof TRow>(
  rows: ReadonlyArray<TRow>,
  rowId: RowId,
  accessor: K,
  value: TRow[K],
): ReadonlyArray<TRow> =>
  rows.map((row) =>
    row.id === rowId ? { ...row, [accessor]: value } : row,
  ) as ReadonlyArray<TRow>;

const applyChangedCell = <TRow extends { id: RowId }>(
  changedCellsByRow: ReadonlyMap<RowId, ReadonlySet<keyof TRow>>,
  originalRowsById: ReadonlyMap<RowId, TRow>,
  edit: CellEdit<TRow>,
  appliedValue: TRow[keyof TRow],
): ReadonlyMap<RowId, ReadonlySet<keyof TRow>> => {
  const next = new Map(changedCellsByRow);
  const changedCells = new Set(next.get(edit.rowId));
  const originalRow = originalRowsById.get(edit.rowId);

  if (originalRow && Object.is(originalRow[edit.accessor], appliedValue)) {
    changedCells.delete(edit.accessor);
  } else {
    changedCells.add(edit.accessor);
  }

  if (changedCells.size === 0) {
    next.delete(edit.rowId);
  } else {
    next.set(edit.rowId, changedCells);
  }

  return next;
};

function reducer<TRow extends { id: RowId }>(
  state: UndoRedoState<TRow>,
  action: UndoRedoAction<TRow>,
): UndoRedoState<TRow> {
  switch (action.type) {
    case 'reset':
      return createState(action.rows);

    case 'syncRows':
      if (
        state.past.length > 0 ||
        state.future.length > 0 ||
        state.changedCellsByRow.size > 0
      ) {
        return state;
      }
      return createState(action.rows);

    case 'commit': {
      const rows = updateRowValue(
        state.rows,
        action.edit.rowId,
        action.edit.accessor,
        action.edit.nextValue,
      );

      // Keep memory bounded by storing only the most recent compact cell
      // patches. A 10k-row table should not keep whole-table snapshots for
      // every edit.
      const past = [...state.past, action.edit].slice(-action.historyLimit);
      const changedCellsByRow = applyChangedCell(
        state.changedCellsByRow,
        state.originalRowsById,
        action.edit,
        action.edit.nextValue,
      );

      return {
        ...state,
        rows,
        past,
        future: [],
        changedCellsByRow,
      };
    }

    case 'undo': {
      const edit = state.past.at(-1);
      if (!edit) return state;

      const rows = updateRowValue(
        state.rows,
        edit.rowId,
        edit.accessor,
        edit.previousValue,
      );
      const changedCellsByRow = applyChangedCell(
        state.changedCellsByRow,
        state.originalRowsById,
        edit,
        edit.previousValue,
      );

      return {
        ...state,
        rows,
        past: state.past.slice(0, -1),
        future: [edit, ...state.future],
        changedCellsByRow,
      };
    }

    case 'redo': {
      const [edit, ...future] = state.future;
      if (!edit) return state;

      const rows = updateRowValue(
        state.rows,
        edit.rowId,
        edit.accessor,
        edit.nextValue,
      );
      const changedCellsByRow = applyChangedCell(
        state.changedCellsByRow,
        state.originalRowsById,
        edit,
        edit.nextValue,
      );

      return {
        ...state,
        rows,
        past: [...state.past, edit],
        future,
        changedCellsByRow,
      };
    }

    case 'clearHistory':
      return {
        ...state,
        past: [],
        future: [],
      };
  }
}

export function useUndoRedo<TRow extends { id: RowId }>({
  rows,
  historyLimit = DEFAULT_HISTORY_LIMIT,
}: UseUndoRedoOptions<TRow>): UseUndoRedoResult<TRow> {
  const [state, dispatch] = useReducer(reducer<TRow>, rows, createState);

  useEffect(() => {
    dispatch({ type: 'syncRows', rows });
  }, [rows]);

  const commitCellEdit = useCallback<UseUndoRedoResult<TRow>['commitCellEdit']>(
    (rowId, accessor, nextValue) => {
      const row = state.rows.find((candidate) => candidate.id === rowId);
      if (!row) return false;

      const previousValue = row[accessor];
      if (Object.is(previousValue, nextValue)) return false;

      dispatch({
        type: 'commit',
        edit: {
          rowId,
          accessor,
          previousValue,
          nextValue,
        },
        historyLimit,
      });
      return true;
    },
    [historyLimit, state.rows],
  );

  const undo = useCallback(() => {
    dispatch({ type: 'undo' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'redo' });
  }, []);

  const clearHistory = useCallback(() => {
    dispatch({ type: 'clearHistory' });
  }, []);

  const editedRowIds = useMemo(
    () => new Set(state.changedCellsByRow.keys()),
    [state.changedCellsByRow],
  );

  return {
    rows: state.rows,
    editedRowIds,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    commitCellEdit,
    undo,
    redo,
    clearHistory,
  };
}
