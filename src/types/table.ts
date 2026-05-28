import type { ReactNode } from 'react';

export type RowId = string | number;

export type SortDirection = 'asc' | 'desc';

export type SortState = {
  columnId: string;
  direction: SortDirection;
} | null;

export type FilterState = Record<string, string>;

export type PaginationState = {
  pageIndex: number;
  pageSize: number;
};

export type ValidationResult =
  | { valid: true }
  | { valid: false; message: string };

export type CellRenderContext<TRow, TValue> = {
  value: TValue;
  row: TRow;
  rowId: RowId;
  isEditing: boolean;
};

export type ColumnDef<TRow, K extends keyof TRow = keyof TRow> = {
  id: string;
  header: string;
  accessor: K;
  editable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  width?: number | string;
  renderCell?: (ctx: CellRenderContext<TRow, TRow[K]>) => ReactNode;
  sortFn?: (a: TRow[K], b: TRow[K]) => number;
  filterFn?: (value: TRow[K], filter: string) => boolean;
  validate?: (value: TRow[K], row: TRow) => ValidationResult;
};

export type AnyColumnDef<TRow> = {
  [K in keyof TRow]-?: ColumnDef<TRow, K>;
}[keyof TRow];

export type ColumnDefs<TRow> = ReadonlyArray<AnyColumnDef<TRow>>;

export type EditableRowState<TRow> = {
  rowId: RowId | null;
  draft: Partial<TRow>;
  errors: Partial<Record<keyof TRow, string>>;
};

export const defineColumn = <TRow, K extends keyof TRow>(
  column: ColumnDef<TRow, K>,
): ColumnDef<TRow, K> => column;
