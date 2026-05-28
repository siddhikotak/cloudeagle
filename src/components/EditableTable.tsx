import { useContext, useMemo, type ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableCol,
  TableColgroup,
  TableEmptyState,
  TableHeader,
  TableLoadingState,
  TableRow,
} from '@/components/table';
import { TableStateContext } from '@/components/TableContext';
import { EditableTableRow } from '@/components/EditableTableRow';
import type { ColumnDef, ColumnDefs, RowId } from '@/types/table';
import { paginateRows } from '@/utils/pagination';

type TableStateContent = {
  title?: string;
  description?: string;
  icon?: ReactNode;
};

type EditableTableProps<TRow extends { id: RowId }> = {
  data: ReadonlyArray<TRow>;
  columns: ColumnDefs<TRow>;
  layout?: 'auto' | 'fixed';
  isLoading?: boolean;
  isFiltered?: boolean;
  loadingRowCount?: number;
  emptyState?: TableStateContent;
  noResultsState?: TableStateContent;
  onCommitCell?:
    | ((rowId: RowId, accessor: keyof TRow, value: string | number) => void)
    | undefined;
};

export function EditableTable<TRow extends { id: RowId }>({
  data,
  columns,
  layout = 'auto',
  isLoading = false,
  isFiltered = false,
  loadingRowCount = 8,
  emptyState,
  noResultsState,
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
  const pagination = tableState?.pagination;
  const visibleRows = useMemo(
    () => (pagination ? paginateRows(data, pagination).rows : data),
    [data, pagination],
  );
  const columnCount = Math.max(columns.length, 1);
  const showEmptyState = !isLoading && data.length === 0;
  const stateContent = isFiltered
    ? {
        title: 'No results',
        description: 'Try adjusting your filters or search query.',
        ...noResultsState,
      }
    : {
        title: 'No data',
        description: 'There is nothing to display yet.',
        ...emptyState,
      };

  return (
    <Table layout={layout} aria-busy={isLoading || undefined}>
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
        {isLoading ? (
          <TableLoadingState
            columnCount={columnCount}
            rowCount={loadingRowCount}
          />
        ) : null}
        {showEmptyState ? (
          <TableEmptyState columnCount={columnCount} {...stateContent} />
        ) : null}
        {!isLoading &&
          visibleRows.map((row) => {
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
