import type { PaginationState, RowId } from '@/types/table';

export type PaginationMeta = {
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  totalRows: number;
  startRow: number;
  endRow: number;
  canPreviousPage: boolean;
  canNextPage: boolean;
};

export type PaginatedRowsResult<TRow> = {
  rows: TRow[];
  meta: PaginationMeta;
};

export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export const getPageCount = (totalRows: number, pageSize: number): number => {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(totalRows / pageSize));
};

export const clampPageIndex = (
  pageIndex: number,
  totalRows: number,
  pageSize: number,
): number => {
  const pageCount = getPageCount(totalRows, pageSize);
  return Math.min(Math.max(pageIndex, 0), pageCount - 1);
};

export const getPaginationMeta = (
  totalRows: number,
  pagination: PaginationState,
): PaginationMeta => {
  const pageSize = Math.max(1, pagination.pageSize);
  const pageIndex = clampPageIndex(pagination.pageIndex, totalRows, pageSize);
  const pageCount = getPageCount(totalRows, pageSize);
  const startRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const endRow = Math.min(totalRows, (pageIndex + 1) * pageSize);

  return {
    pageIndex,
    pageSize,
    pageCount,
    totalRows,
    startRow,
    endRow,
    canPreviousPage: pageIndex > 0,
    canNextPage: pageIndex < pageCount - 1,
  };
};

export const paginateRows = <TRow extends { id: RowId }>(
  rows: ReadonlyArray<TRow>,
  pagination: PaginationState,
): PaginatedRowsResult<TRow> => {
  const meta = getPaginationMeta(rows.length, pagination);
  const start = meta.pageIndex * meta.pageSize;
  const end = start + meta.pageSize;

  return {
    rows: rows.slice(start, end),
    meta,
  };
};
