type TableSkeletonRowProps = {
  columnCount: number;
};

// Skeleton bar widths cycled per column to give visual variety without
// looking random. Decorative only — hidden from screen readers.
const BAR_WIDTHS = ['w-3/4', 'w-1/2', 'w-2/3', 'w-full', 'w-5/6'] as const;

export function TableSkeletonRow({ columnCount }: TableSkeletonRowProps) {
  return (
    <tr aria-hidden="true">
      {Array.from({ length: columnCount }, (_, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className={`h-4 animate-pulse rounded bg-slate-200 ${
              BAR_WIDTHS[i % BAR_WIDTHS.length]
            }`}
          />
        </td>
      ))}
    </tr>
  );
}
