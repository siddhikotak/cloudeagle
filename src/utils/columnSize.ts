import type { CSSProperties } from 'react';

export type ColumnSize = {
  width?: number | string | undefined;
  minWidth?: number | string | undefined;
  maxWidth?: number | string | undefined;
};

export const getColumnSizeStyle = (size: ColumnSize): CSSProperties => {
  const style: CSSProperties = {};
  if (size.width !== undefined) style.width = size.width;
  if (size.minWidth !== undefined) style.minWidth = size.minWidth;
  if (size.maxWidth !== undefined) style.maxWidth = size.maxWidth;
  return style;
};
