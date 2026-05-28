import type { ColumnDef, ColumnDefs, RowId } from '@/types/table';

export type CsvExportOptions = {
  includeBom?: boolean;
};

const CSV_MIME_TYPE = 'text/csv;charset=utf-8';

export const escapeCsvValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';

  const text =
    value instanceof Date
      ? value.toISOString()
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);

  // RFC 4180-style escaping: wrap fields containing commas, quotes, or
  // line breaks in double quotes, and escape embedded quotes by doubling.
  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
};

export const rowsToCsv = <TRow extends { id: RowId }>(
  rows: ReadonlyArray<TRow>,
  columns: ColumnDefs<TRow>,
  options: CsvExportOptions = {},
): string => {
  const resolvedColumns = columns.map(
    (column) => column as ColumnDef<TRow, keyof TRow>,
  );

  const header = resolvedColumns
    .map((column) => escapeCsvValue(column.header))
    .join(',');

  const body = rows.map((row) =>
    resolvedColumns
      .map((column) => escapeCsvValue(row[column.accessor]))
      .join(','),
  );

  const csv = [header, ...body].join('\r\n');
  return options.includeBom ? `\uFEFF${csv}` : csv;
};

export const downloadCsv = (
  csv: string,
  filename = 'table-export.csv',
): void => {
  const blob = new Blob([csv], { type: CSV_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
};
