import type { ReactNode } from 'react';

type TableEmptyStateProps = {
  columnCount: number;
  title?: string;
  description?: string;
  icon?: ReactNode;
};

// `columnCount` is accepted for API parity with the table-layout version
// but unused under the block-table layout used by EditableTable: the empty
// state renders as a div that fills the (relative, block) tbody and
// centers its content via flexbox.
export function TableEmptyState({
  columnCount: _columnCount,
  title = 'No data',
  description = 'There is nothing to display yet.',
  icon,
}: TableEmptyStateProps) {
  void _columnCount;
  return (
    <div
      role="status"
      className="flex w-full items-center justify-center px-4 py-16"
    >
      <div className="flex max-w-sm flex-col items-center gap-2 text-center">
        {icon}
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}
