import type { ColHTMLAttributes } from 'react';
import { getColumnSizeStyle, type ColumnSize } from '@/utils/columnSize';

type TableColProps = Omit<ColHTMLAttributes<HTMLTableColElement>, 'width'> &
  ColumnSize;

export function TableCol({
  width,
  minWidth,
  maxWidth,
  style,
  ...rest
}: TableColProps) {
  const sizeStyle = getColumnSizeStyle({ width, minWidth, maxWidth });
  return <col style={{ ...style, ...sizeStyle }} {...rest} />;
}
