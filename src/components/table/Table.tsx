import type { ReactNode, TableHTMLAttributes } from 'react';

type TableProps = TableHTMLAttributes<HTMLTableElement> & {
  children: ReactNode;
};

export function Table({ className = '', children, ...rest }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table
        className={`w-full border-collapse text-left text-sm ${className}`}
        {...rest}
      >
        {children}
      </table>
    </div>
  );
}
