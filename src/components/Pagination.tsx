import { useCallback, useMemo, type ChangeEvent } from 'react';
import { useTable } from '@/hooks/useTable';
import {
  DEFAULT_PAGE_SIZE_OPTIONS,
  getPaginationMeta,
} from '@/utils/pagination';

type PaginationProps = {
  totalRows: number;
  pageSizeOptions?: ReadonlyArray<number>;
  className?: string;
};

const buttonClass =
  'rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white';

export function Pagination({
  totalRows,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  className = '',
}: PaginationProps) {
  const { pagination, setPageIndex, setPageSize } = useTable();

  const meta = useMemo(
    () => getPaginationMeta(totalRows, pagination),
    [pagination, totalRows],
  );

  const handleFirstPage = useCallback(() => {
    setPageIndex(0);
  }, [setPageIndex]);

  const handlePreviousPage = useCallback(() => {
    setPageIndex(meta.pageIndex - 1);
  }, [meta.pageIndex, setPageIndex]);

  const handleNextPage = useCallback(() => {
    setPageIndex(meta.pageIndex + 1);
  }, [meta.pageIndex, setPageIndex]);

  const handleLastPage = useCallback(() => {
    setPageIndex(meta.pageCount - 1);
  }, [meta.pageCount, setPageIndex]);

  const handlePageSizeChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setPageSize(Number(event.target.value));
    },
    [setPageSize],
  );

  return (
    <nav
      className={`flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
      aria-label="Table pagination"
    >
      <p className="text-sm text-slate-600" aria-live="polite">
        Showing{' '}
        <span className="font-medium text-slate-900">{meta.startRow}</span> to{' '}
        <span className="font-medium text-slate-900">{meta.endRow}</span> of{' '}
        <span className="font-medium text-slate-900">{meta.totalRows}</span>
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Rows per page
          <select
            value={meta.pageSize}
            onChange={handlePageSizeChange}
            className="rounded-md border border-slate-200 bg-white px-2 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <p className="min-w-24 text-center text-sm text-slate-600">
            Page{' '}
            <span className="font-medium text-slate-900">
              {meta.pageIndex + 1}
            </span>{' '}
            of{' '}
            <span className="font-medium text-slate-900">{meta.pageCount}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={buttonClass}
              onClick={handleFirstPage}
              disabled={!meta.canPreviousPage}
              aria-label="Go to first page"
            >
              First
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={handlePreviousPage}
              disabled={!meta.canPreviousPage}
              aria-label="Go to previous page"
            >
              Previous
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={handleNextPage}
              disabled={!meta.canNextPage}
              aria-label="Go to next page"
            >
              Next
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={handleLastPage}
              disabled={!meta.canNextPage}
              aria-label="Go to last page"
            >
              Last
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
