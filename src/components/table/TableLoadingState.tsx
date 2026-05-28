import { TableSkeletonRow } from './TableSkeletonRow';

type TableLoadingStateProps = {
  columnCount: number;
  rowCount?: number;
};

export function TableLoadingState({
  columnCount,
  rowCount = 6,
}: TableLoadingStateProps) {
  return (
    <>
      {/* Visually hidden but announced by screen readers, so users with
          assistive tech know the table is loading rather than empty. */}
      <tr className="sr-only">
        <td colSpan={columnCount} role="status" aria-live="polite">
          Loading data
        </td>
      </tr>
      {Array.from({ length: rowCount }, (_, i) => (
        <TableSkeletonRow key={i} columnCount={columnCount} />
      ))}
    </>
  );
}
