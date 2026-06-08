'use client';

import { useCallback, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { downloadCsv } from '@/lib/csvExport';
import {
  drawPdfPageHeader,
  loadPdfLogoDataUrl,
  PDF_HEADER_HEIGHT,
} from '@/lib/pdf-export-header';
import type { ExportOptions } from '../types';

type ExportRow = (string | number)[];

function resolveExportColumns<TData>(
  columns: ColumnDef<TData, unknown>[],
): { header: string; getValue: (row: TData) => string | number }[] {
  return columns
    .filter(col => col.id !== 'actions' && col.enableHiding !== false)
    .map(col => {
      const header =
        col.meta?.exportHeader ??
        (typeof col.header === 'string' ? col.header : col.id ?? '');
      const rawGetValue = col.meta?.exportValue;
      const getValue = (row: TData): string | number => {
        if (rawGetValue) {
          const v = rawGetValue(row);
          return v == null ? '' : v;
        }
        if ('accessorFn' in col && col.accessorFn) {
          const v = col.accessorFn(row, 0);
          return v == null ? '' : String(v);
        }
        if ('accessorKey' in col && col.accessorKey) {
          const key = col.accessorKey as keyof TData;
          const v = row[key];
          return v == null ? '' : String(v);
        }
        return '';
      };
      return { header, getValue };
    })
    .filter(col => col.header);
}

function buildRows<TData>(
  data: TData[],
  exportColumns: ReturnType<typeof resolveExportColumns<TData>>,
): ExportRow[] {
  return data.map(row =>
    exportColumns.map(col => {
      const v = col.getValue(row);
      return v == null ? '' : v;
    }),
  );
}

export function useTableExport<TData>({
  data,
  columns,
  options,
}: {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  options: ExportOptions;
}) {
  const exportColumns = useMemo(
    () => resolveExportColumns(columns),
    [columns],
  );

  const disabled = data.length === 0 || exportColumns.length === 0;
  const dateSuffix = new Date().toISOString().slice(0, 10);
  const baseFilename = options.filename.replace(/\.(csv|xlsx|pdf)$/i, '');

  const exportExcel = useCallback(async () => {
    if (disabled) return;
    const XLSX = await import('xlsx');
    const headers = exportColumns.map(c => c.header);
    const rows = buildRows(data, exportColumns);
    const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Données');
    XLSX.writeFile(workbook, `${baseFilename}-${dateSuffix}.xlsx`);
  }, [baseFilename, data, dateSuffix, disabled, exportColumns]);

  const exportPdf = useCallback(async () => {
    if (disabled) return;
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF({ orientation: 'landscape' });
    const logoDataUrl = await loadPdfLogoDataUrl();
    const firstPageStartY = drawPdfPageHeader(doc, logoDataUrl, {
      tableTitle: options.title,
    });

    autoTable(doc, {
      head: [exportColumns.map(c => c.header)],
      body: buildRows(data, exportColumns).map(row => row.map(String)),
      startY: firstPageStartY,
      margin: { top: PDF_HEADER_HEIGHT },
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [31, 27, 46] },
      willDrawPage: data => {
        if (data.pageNumber === 1) return;
        drawPdfPageHeader(doc, logoDataUrl);
      },
    });
    doc.save(`${baseFilename}-${dateSuffix}.pdf`);
  }, [baseFilename, data, dateSuffix, disabled, exportColumns, options.title]);

  const exportCsv = useCallback(() => {
    if (disabled) return;
    const headers = exportColumns.map(c => c.header);
    const rows = buildRows(data, exportColumns);
    downloadCsv(`${baseFilename}-${dateSuffix}.csv`, headers, rows);
  }, [baseFilename, data, dateSuffix, disabled, exportColumns]);

  return { exportExcel, exportPdf, exportCsv, disabled };
}
