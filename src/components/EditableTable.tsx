import {
  useCallback,
  useContext,
  useMemo,
  type CSSProperties,
  type ReactNode,
} from 'react';
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
import { useBeforeUnloadWarning } from '@/hooks/useBeforeUnloadWarning';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useVirtualRows } from '@/hooks/useVirtualRows';
import type { ColumnDef, ColumnDefs, RowId } from '@/types/table';
import { downloadCsv, rowsToCsv } from '@/utils/csv';
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
  editHistoryLimit?: number;
  csvFileName?: string;
  headerFilters?: Partial<Record<string, ReactNode>>;
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
  editHistoryLimit = 100,
  csvFileName = 'table-export.csv',
  headerFilters,
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
  const pagination = tableState?.pagination;
  const undoRedo = useUndoRedo({ rows: data, historyLimit: editHistoryLimit });
  const {
    rows: draftRows,
    editedRowIds,
    modifiedRowCount,
    hasUnsavedChanges,
    canUndo,
    canRedo,
    commitCellEdit,
    undo,
    redo,
  } = undoRedo;
  useBeforeUnloadWarning(hasUnsavedChanges);
  const visibleRows = useMemo(
    () => (pagination ? paginateRows(draftRows, pagination).rows : draftRows),
    [draftRows, pagination],
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
  const tableMinWidth = useMemo(
    () =>
      columns.reduce((total, column) => {
        const c = column as ColumnDef<TRow, keyof TRow>;
        return total + getColumnMinWidth(c);
      }, 0),
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

  const handleCommitCell = useCallback(
    (rowId: RowId, accessor: keyof TRow, value: string | number): boolean => {
      const didCommit = commitCellEdit(
        rowId,
        accessor,
        value as TRow[keyof TRow],
      );

      if (didCommit) {
        onCommitCell?.(rowId, accessor, value);
      }

      return didCommit;
    },
    [commitCellEdit, onCommitCell],
  );

  const handleExportCsv = useCallback(() => {
    const csv = rowsToCsv(visibleRows, columns, { includeBom: true });
    downloadCsv(csv, csvFileName);
  }, [columns, csvFileName, visibleRows]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div aria-live="polite">
          {hasUnsavedChanges ? (
            <span className="inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              {modifiedRowCount} modified{' '}
              {modifiedRowCount === 1 ? 'row' : 'rows'} unsaved
            </span>
          ) : (
            <span className="text-sm text-slate-500">No unsaved changes</span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isLoading || visibleRows.length === 0}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
          >
            Redo
          </button>
        </div>
      </div>
      <Table
        layout={layout}
        aria-busy={isLoading || undefined}
        containerClassName="rounded-none border-0 shadow-none"
        containerRef={virtual.containerRef}
        containerStyle={
          {
            maxHeight: virtualMaxHeight,
          } satisfies CSSProperties
        }
        onContainerScroll={virtual.onScroll}
        style={{
          width: `max(100%, ${tableMinWidth}px)`,
        }}
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
                <TableCell key={c.id} as="th" className="relative">
                  <div className="flex items-center justify-between gap-2">
                    <span>{c.header}</span>
                    {headerFilters?.[c.id]}
                  </div>
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
                const isEdited = editedRowIds.has(row.id);

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
                    isEdited={isEdited}
                    className="absolute left-0 right-0 grid border-b border-slate-100"
                    style={{
                      gridTemplateColumns,
                      height: virtualRow.size,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    cellClassName="flex items-center overflow-hidden"
                    markRowEditedOnCommit={false}
                    onCommitCell={handleCommitCell}
                  />
                );
              })
            : null}
        </TableBody>
      </Table>
    </div>
  );
}

const toCssSize = (value: number | string): string =>
  typeof value === 'number' ? `${value}px` : value;

const parsePixelSize = (value: number | string | undefined): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.endsWith('px')) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const getColumnMinWidth = <TRow, K extends keyof TRow>(
  column: ColumnDef<TRow, K>,
): number =>
  parsePixelSize(column.width) || parsePixelSize(column.minWidth) || 160;

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
