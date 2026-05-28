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
};

export function EditableTable<TRow extends { id: RowId }>({
  data,
  columns,
  layout = 'auto',
}: EditableTableProps<TRow>) {
  // Subscribe to editingRowId at the parent (not inside each row) so that:
  //   - rows themselves never read context and so don't subscribe to it,
  //     keeping them pure functions of their props
  //   - on every editing transition, only EditableTable re-runs; React.memo
  //     short-circuits every row whose isEditing prop didn't change
  //
  // useContext is used directly (not the useTable hook) so EditableTable
  // also works without a TableProvider ancestor — in that case the context
  // returns null and every row gets isEditing=false.
  const tableState = useContext(TableStateContext);
  const editingRowId = tableState?.editingRowId ?? null;

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
        {data.map((row) => (
          <EditableTableRow
            key={row.id}
            row={row}
            columns={columns}
            isEditing={editingRowId === row.id}
          />
        ))}
      </TableBody>
    </Table>
  );
}
