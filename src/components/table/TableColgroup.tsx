import type { HTMLAttributes, ReactNode } from 'react';

type TableColgroupProps = HTMLAttributes<HTMLTableColElement> & {
  children: ReactNode;
};

export function TableColgroup({ children, ...rest }: TableColgroupProps) {
  return <colgroup {...rest}>{children}</colgroup>;
}
