import { memo, useContext, type ReactNode } from 'react';
import { TableCell, TableRow } from '@/components/table';
import { TableActionsContext } from '@/components/TableContext';
import { EditableCell } from '@/components/EditableCell';
import type {
  ColumnDef,
  ColumnDefs,
  RowId,
  ValidationResult,
} from '@/types/table';

// Re-render optimization strategy
// -------------------------------------------------------------------------
// Wrapped in React.memo so the row's function body only runs when one of
// its props changes by shallow comparison: row, columns, editingColumnId,
// isEdited, onCommitCell.
//
//  - Cell-level editing transitions: only the row containing the previously
//    editing cell and the row containing the newly editing cell see
//    editingColumnId flip (from a string to null or null to a string).
//    Every other row gets editingColumnId === null in both renders and
//    React.memo bails out.
//  - Edited highlight: when a row is added to editedRowIds, only that row
//    sees isEdited flip. Other rows bail out.
//  - Cell typing: keystrokes live entirely inside EditableCell's local
//    useState. The row's body never re-runs while the user types.
//  - Columns is compared by reference: the caller of EditableTable MUST
//    memoize its columns array, otherwise every parent re-render busts
//    the memo for every row.
//  - onCommitCell must also be a stable reference (useCallback at the
//    App level) for the same reason.
//  - The row subscribes to TableActionsContext (not TableStateContext).
//    The actions context value is referentially stable across the
//    provider's lifetime, so subscribing here does not cause extra
//    re-renders.
// -------------------------------------------------------------------------

type EditableTableRowProps<TRow extends { id: RowId }> = {
  row: TRow;
  columns: ColumnDefs<TRow>;
  editingColumnId: string | null;
  isEdited: boolean;
  onCommitCell?:
    | ((rowId: RowId, accessor: keyof TRow, value: string | number) => void)
    | undefined;
};

const formatValue = (value: unknown): ReactNode => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

function EditableTableRowImpl<TRow extends { id: RowId }>({
  row,
  columns,
  editingColumnId,
  isEdited,
  onCommitCell,
}: EditableTableRowProps<TRow>) {
  const actions = useContext(TableActionsContext);

  return (
    <TableRow className={isEdited ? 'bg-amber-50! hover:bg-amber-100!' : ''}>
      {columns.map((column) => {
        const c = column as ColumnDef<TRow, keyof TRow>;
        const value = row[c.accessor];
        const cellIsEditing = c.id === editingColumnId;

        // Custom renderCell takes precedence — the consumer is responsible
        // for click-to-edit wiring in that case.
        if (c.renderCell) {
          return (
            <TableCell key={c.id}>
              {c.renderCell({
                value,
                row,
                rowId: row.id,
                isEditing: cellIsEditing,
              })}
            </TableCell>
          );
        }

        if (c.editable) {
          const handleActivate = () => {
            actions?.setEditingCell({ rowId: row.id, columnId: c.id });
          };
          const handleSave = (next: string | number) => {
            // The original value lives in the immutable `row` prop and is
            // untouched until the parent updates upstream state in response
            // to onCommitCell. If the parent never commits, the next render
            // reverts the cell to the original automatically.
            onCommitCell?.(row.id, c.accessor, next);
            actions?.markRowEdited(row.id);
            actions?.clearEditingCell();
          };
          const handleCancel = () => {
            actions?.clearEditingCell();
          };

          const columnValidate = c.validate;

          if (typeof value === 'number') {
            return (
              <TableCell key={c.id}>
                <EditableCell
                  type="number"
                  value={value}
                  isEditing={cellIsEditing}
                  onActivate={handleActivate}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  {...(columnValidate
                    ? {
                        validate: (v: number): ValidationResult =>
                          columnValidate(v as TRow[keyof TRow], row),
                      }
                    : {})}
                />
              </TableCell>
            );
          }

          const textValue =
            value === null || value === undefined ? '' : String(value);
          return (
            <TableCell key={c.id}>
              <EditableCell
                type="text"
                value={textValue}
                isEditing={cellIsEditing}
                onActivate={handleActivate}
                onSave={handleSave}
                onCancel={handleCancel}
                {...(columnValidate
                  ? {
                      validate: (v: string): ValidationResult =>
                        columnValidate(v as TRow[keyof TRow], row),
                    }
                  : {})}
              />
            </TableCell>
          );
        }

        return <TableCell key={c.id}>{formatValue(value)}</TableCell>;
      })}
    </TableRow>
  );
}

export const EditableTableRow = memo(
  EditableTableRowImpl,
) as typeof EditableTableRowImpl;
