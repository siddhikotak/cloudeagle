import type { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableCol,
  TableColgroup,
  TableHeader,
  TableRow,
} from '@/components/table';
import type { ColumnDef, ColumnDefs, RowId } from '@/types/table';

type EditableTableProps<TRow extends { id: RowId }> = {
  data: ReadonlyArray<TRow>;
  columns: ColumnDefs<TRow>;
  layout?: 'auto' | 'fixed';
};

const formatValue = (value: unknown): ReactNode => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export function EditableTable<TRow extends { id: RowId }>({
  data,
  columns,
  layout = 'auto',
}: EditableTableProps<TRow>) {
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
          <TableRow key={row.id}>
            {columns.map((column) => {
              const c = column as ColumnDef<TRow, keyof TRow>;
              const value = row[c.accessor];
              const content = c.renderCell
                ? c.renderCell({
                    value,
                    row,
                    rowId: row.id,
                    isEditing: false,
                  })
                : formatValue(value);
              return <TableCell key={c.id}>{content}</TableCell>;
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
