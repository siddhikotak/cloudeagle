import type { ReactNode } from 'react';

type TableEmptyStateProps = {
  columnCount: number;
  title?: string;
  description?: string;
  icon?: ReactNode;
};

export function TableEmptyState({
  columnCount,
  title = 'No data',
  description = 'There is nothing to display yet.',
  icon,
}: TableEmptyStateProps) {
  return (
    <tr>
      <td colSpan={columnCount} className="px-4 py-12">
        <div
          role="status"
          className="flex flex-col items-center justify-center gap-2 text-center"
        >
          {icon}
          <p className="text-sm font-semibold text-slate-700">{title}</p>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </td>
    </tr>
  );
}
