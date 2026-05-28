import type { ReactNode, TableHTMLAttributes } from 'react';

type TableProps = TableHTMLAttributes<HTMLTableElement> & {
  children: ReactNode;
  layout?: 'auto' | 'fixed';
};

export function Table({
  className = '',
  children,
  layout = 'auto',
  ...rest
}: TableProps) {
  const layoutClass = layout === 'fixed' ? 'table-fixed' : 'table-auto';
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table
        className={`min-w-full border-collapse text-left text-sm ${layoutClass} ${className}`}
        {...rest}
      >
        {children}
      </table>
    </div>
  );
}
