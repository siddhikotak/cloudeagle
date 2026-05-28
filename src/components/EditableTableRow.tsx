import { memo, type ReactNode } from 'react';
import { TableCell, TableRow } from '@/components/table';
import type { ColumnDef, ColumnDefs, RowId } from '@/types/table';

// Re-render optimization strategy
// -------------------------------------------------------------------------
// Wrapped in React.memo so the row's function body only runs when one of
// its props changes by shallow comparison: `row`, `columns`, `isEditing`.
//
// What changes when, and what it costs:
//
//   1. Editing transitions (startEditing / stopEditing):
//      The parent (EditableTable) computes `isEditing = editingRowId === row.id`
//      per row. Only two rows ever see a changed isEditing prop — the
//      previously-editing row (true -> false) and the newly-editing row
//      (false -> true). For every other row, all three props are
//      referentially equal and React.memo bails out without running this
//      component's body. Net cost: 2 row re-renders, not N.
//
//   2. Row data mutation (after a committed edit):
//      The caller must replace the edited row with a new object reference
//      so this row's `row` prop differs by identity and the memo invalidates.
//      Untouched rows keep their old references and are skipped.
//
//   3. Columns array:
//      Compared by reference, so the caller of EditableTable MUST memoize
//      its columns (e.g. `useMemo(() => [...], [])`). If a fresh columns
//      array is passed on every parent render, the memo busts for every row
//      and the optimization is lost.
//
//   4. Callbacks (added in later editing work):
//      Any handlers passed in here must be wrapped in useCallback at the
//      parent so their identity is stable. Inline arrow functions would
//      create a new reference per render and defeat the memo.
// -------------------------------------------------------------------------

type EditableTableRowProps<TRow extends { id: RowId }> = {
  row: TRow;
  columns: ColumnDefs<TRow>;
  isEditing: boolean;
};

const formatValue = (value: unknown): ReactNode => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

function EditableTableRowImpl<TRow extends { id: RowId }>({
  row,
  columns,
  isEditing,
}: EditableTableRowProps<TRow>) {
  return (
    <TableRow>
      {columns.map((column) => {
        const c = column as ColumnDef<TRow, keyof TRow>;
        const value = row[c.accessor];
        const content = c.renderCell
          ? c.renderCell({ value, row, rowId: row.id, isEditing })
          : formatValue(value);
        return <TableCell key={c.id}>{content}</TableCell>;
      })}
    </TableRow>
  );
}

// React.memo erases the generic signature; the cast restores it so call
// sites keep full TRow inference. Runtime behavior is unchanged.
export const EditableTableRow = memo(
  EditableTableRowImpl,
) as typeof EditableTableRowImpl;
