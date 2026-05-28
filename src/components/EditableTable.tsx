import { useContext } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableCol,
  TableColgroup,
  TableHeader,
  TableRow,
} from '@/components/table';
import { TableStateContext } from '@/components/TableContext';
import { EditableTableRow } from '@/components/EditableTableRow';
import type { ColumnDef, ColumnDefs, RowId } from '@/types/table';

type EditableTableProps<TRow extends { id: RowId }> = {
  data: ReadonlyArray<TRow>;
  columns: ColumnDefs<TRow>;
  layout?: 'auto' | 'fixed';
  onCommitCell?:
    | ((rowId: RowId, accessor: keyof TRow, value: string | number) => void)
    | undefined;
};

export function EditableTable<TRow extends { id: RowId }>({
  data,
  columns,
  layout = 'auto',
  onCommitCell,
}: EditableTableProps<TRow>) {
  // Subscribe to editingCell + editedRowIds at the parent (not in each
  // row). Each row receives narrow per-row props so React.memo can bail
  // out for unaffected rows on every state change.
  //
  // useContext is used directly (not the useTable hook) so EditableTable
  // also works without a TableProvider ancestor — in that case the context
  // returns null and every row gets editingColumnId=null, isEdited=false.
  const tableState = useContext(TableStateContext);
  const editingCell = tableState?.editingCell ?? null;
  const editedRowIds = tableState?.editedRowIds;

  return (
    <Table layout={layout}>
      <TableColgroup>
        {columns.map((column) => {
          const c = column as ColumnDef<TRow, keyof TRow>;
          return (
            <TableCol
              key={c.id}
              width={c.width}
              minWidth={c.minWidth}
              maxWidth={c.maxWidth}
            />
          );
        })}
      </TableColgroup>
      <TableHeader>
        <TableRow>
          {columns.map((column) => {
            const c = column as ColumnDef<TRow, keyof TRow>;
            return (
              <TableCell key={c.id} as="th">
                {c.header}
              </TableCell>
            );
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => {
          const editingColumnId =
            editingCell && editingCell.rowId === row.id
              ? editingCell.columnId
              : null;
          return (
            <EditableTableRow
              key={row.id}
              row={row}
              columns={columns}
              editingColumnId={editingColumnId}
              isEdited={editedRowIds?.has(row.id) ?? false}
              onCommitCell={onCommitCell}
            />
          );
        })}
      </TableBody>
    </Table>
  );
}
