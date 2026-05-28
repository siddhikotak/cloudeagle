import type { HTMLAttributes, ReactNode } from 'react';

type TableBodyProps = HTMLAttributes<HTMLTableSectionElement> & {
  children: ReactNode;
};

export function TableBody({
  className = '',
  children,
  ...rest
}: TableBodyProps) {
  return (
    <tbody className={`divide-y divide-slate-100 ${className}`} {...rest}>
      {children}
    </tbody>
  );
}
