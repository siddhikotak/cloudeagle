import type {
  CSSProperties,
  ReactNode,
  Ref,
  TableHTMLAttributes,
  UIEventHandler,
} from 'react';

type TableProps = TableHTMLAttributes<HTMLTableElement> & {
  children: ReactNode;
  layout?: 'auto' | 'fixed';
  containerClassName?: string;
  containerRef?: Ref<HTMLDivElement>;
  containerStyle?: CSSProperties;
  onContainerScroll?: UIEventHandler<HTMLDivElement>;
};

export function Table({
  className = '',
  children,
  layout = 'auto',
  containerClassName = '',
  containerRef,
  containerStyle,
  onContainerScroll,
  ...rest
}: TableProps) {
  const layoutClass = layout === 'fixed' ? 'table-fixed' : 'table-auto';
  return (
    <div
      ref={containerRef}
      className={`overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm ${containerClassName}`}
      style={containerStyle}
      onScroll={onContainerScroll}
    >
      <table
        className={`min-w-full border-collapse text-left text-sm ${layoutClass} ${className}`}
        {...rest}
      >
        {children}
      </table>
    </div>
  );
}
