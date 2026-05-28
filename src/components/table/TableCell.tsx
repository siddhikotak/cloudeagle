import type { ReactNode, ThHTMLAttributes } from 'react';

type TableCellProps = ThHTMLAttributes<HTMLTableCellElement> & {
  as?: 'td' | 'th';
  children?: ReactNode;
};

export function TableCell({
  as = 'td',
  className = '',
  children,
  scope,
  ...rest
}: TableCellProps) {
  if (as === 'th') {
    return (
      <th
        scope={scope ?? 'col'}
        className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 ${className}`}
        {...rest}
      >
        {children}
      </th>
    );
  }

  return (
    <td className={`px-4 py-3 text-sm text-slate-700 ${className}`} {...rest}>
      {children}
    </td>
  );
}
