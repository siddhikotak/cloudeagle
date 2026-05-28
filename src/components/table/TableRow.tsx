import type { HTMLAttributes, ReactNode } from 'react';

type TableRowProps = HTMLAttributes<HTMLTableRowElement> & {
  children: ReactNode;
};

export function TableRow({ className = '', children, ...rest }: TableRowProps) {
  return (
    <tr
      className={`transition-colors hover:bg-slate-50 ${className}`}
      {...rest}
    >
      {children}
    </tr>
  );
}
