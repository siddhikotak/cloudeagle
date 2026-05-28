import type { HTMLAttributes, ReactNode } from 'react';

type TableHeaderProps = HTMLAttributes<HTMLTableSectionElement> & {
  children: ReactNode;
};

export function TableHeader({
  className = '',
  children,
  ...rest
}: TableHeaderProps) {
  return (
    <thead
      className={`border-b border-slate-200 bg-slate-50 ${className}`}
      {...rest}
    >
      {children}
    </thead>
  );
}
