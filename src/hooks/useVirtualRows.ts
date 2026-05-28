import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
  type UIEvent,
} from 'react';

export type VirtualRow = {
  index: number;
  start: number;
  size: number;
};

type UseVirtualRowsOptions = {
  rowCount: number;
  rowHeight: number;
  overscan?: number;
};

export type UseVirtualRowsResult = {
  containerRef: RefObject<HTMLDivElement | null>;
  totalSize: number;
  virtualRows: VirtualRow[];
  onScroll: (event: UIEvent<HTMLDivElement>) => void;
};

export function useVirtualRows({
  rowCount,
  rowHeight,
  overscan = 6,
}: UseVirtualRowsOptions): UseVirtualRowsResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const totalSize = rowCount * rowHeight;

  const measureViewport = useCallback(() => {
    const element = containerRef.current;
    if (!element) return;
    setViewportHeight(element.clientHeight);
  }, []);

  useLayoutEffect(() => {
    measureViewport();

    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(measureViewport);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [measureViewport]);

  const onScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  const virtualRows = useMemo<VirtualRow[]>(() => {
    if (rowCount === 0 || rowHeight <= 0) return [];

    // Fixed-height virtualization turns scrollTop into row indexes with
    // simple division. We render a small overscan buffer before and after
    // the viewport so fast scrolling does not expose blank space between
    // browser paint frames.
    const firstVisibleIndex = Math.floor(scrollTop / rowHeight);
    const visibleRowCount = Math.ceil(viewportHeight / rowHeight);
    const startIndex = Math.max(0, firstVisibleIndex - overscan);
    const endIndex = Math.min(
      rowCount,
      firstVisibleIndex + visibleRowCount + overscan + 1,
    );

    return Array.from({ length: endIndex - startIndex }, (_, offset) => {
      const index = startIndex + offset;
      return {
        index,
        start: index * rowHeight,
        size: rowHeight,
      };
    });
  }, [overscan, rowCount, rowHeight, scrollTop, viewportHeight]);

  return {
    containerRef,
    totalSize,
    virtualRows,
    onScroll,
  };
}
