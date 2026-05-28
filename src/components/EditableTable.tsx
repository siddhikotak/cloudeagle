import { useContext, useMemo, type CSSProperties, type ReactNode } from 'react';
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
import { useVirtualRows } from '@/hooks/useVirtualRows';
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
  virtualRowHeight?: number;
  virtualOverscan?: number;
  virtualMaxHeight?: number | string;
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
  virtualRowHeight = 48,
  virtualOverscan = 8,
  virtualMaxHeight = 560,
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
  const virtual = useVirtualRows({
    rowCount: visibleRows.length,
    rowHeight: virtualRowHeight,
    overscan: virtualOverscan,
  });
  const columnCount = Math.max(columns.length, 1);
  const showEmptyState = !isLoading && data.length === 0;
  const gridTemplateColumns = useMemo(
    () =>
      columns
        .map((column) =>
          getVirtualColumnTrack(column as ColumnDef<TRow, keyof TRow>),
        )
        .join(' '),
    [columns],
  );
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
    <Table
      layout={layout}
      aria-busy={isLoading || undefined}
      containerRef={virtual.containerRef}
      containerStyle={
        {
          maxHeight: virtualMaxHeight,
        } satisfies CSSProperties
      }
      onContainerScroll={virtual.onScroll}
    >
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
        <TableRow className="grid" style={{ gridTemplateColumns }}>
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
      <TableBody
        className="relative block divide-y-0"
        style={{ height: virtual.totalSize }}
      >
        {isLoading ? (
          <TableLoadingState
            columnCount={columnCount}
            rowCount={loadingRowCount}
          />
        ) : null}
        {showEmptyState ? (
          <TableEmptyState columnCount={columnCount} {...stateContent} />
        ) : null}
        {!isLoading
          ? virtual.virtualRows.map((virtualRow) => {
              const row = visibleRows[virtualRow.index];
              if (!row) return null;

              const editingColumnId =
                editingCell && editingCell.rowId === row.id
                  ? editingCell.columnId
                  : null;

              // Each row is absolutely positioned inside a body whose
              // height equals the full dataset height. translateY moves
              // the small rendered window to its real scroll location,
              // so 10k rows keep a 10k-row scrollbar without 10k DOM nodes.
              return (
                <EditableTableRow
                  key={row.id}
                  row={row}
                  columns={columns}
                  editingColumnId={editingColumnId}
                  isEdited={editedRowIds?.has(row.id) ?? false}
                  className="absolute left-0 right-0 grid border-b border-slate-100"
                  style={{
                    gridTemplateColumns,
                    height: virtualRow.size,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  cellClassName="flex items-center overflow-hidden"
                  onCommitCell={onCommitCell}
                />
              );
            })
          : null}
      </TableBody>
    </Table>
  );
}

const toCssSize = (value: number | string): string =>
  typeof value === 'number' ? `${value}px` : value;

const getVirtualColumnTrack = <TRow, K extends keyof TRow>(
  column: ColumnDef<TRow, K>,
): string => {
  const width =
    column.width === undefined ? undefined : toCssSize(column.width);
  const minWidth =
    column.minWidth === undefined ? undefined : toCssSize(column.minWidth);
  const maxWidth =
    column.maxWidth === undefined ? undefined : toCssSize(column.maxWidth);

  if (width) return width;
  if (minWidth || maxWidth) {
    return `minmax(${minWidth ?? '0px'}, ${maxWidth ?? '1fr'})`;
  }
  return 'minmax(0, 1fr)';
};
