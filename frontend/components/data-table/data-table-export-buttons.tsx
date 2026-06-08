'use client';

import { FileSpreadsheet, FileText } from 'lucide-react';
import { memo } from 'react';
import { cn } from '@/lib/utils';

interface DataTableExportButtonsProps {
  onExportExcel: () => void;
  onExportPdf: () => void;
  onExportCsv?: () => void;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}

function DataTableExportButtonsInner({
  onExportExcel,
  onExportPdf,
  onExportCsv,
  disabled,
  className,
  compact,
}: DataTableExportButtonsProps) {
  const btnClass = compact
    ? 'w-8 h-8 flex items-center justify-center bg-[#f3f3f5] rounded-lg text-sm hover:bg-[#ececf0] disabled:opacity-40 shrink-0'
    : 'flex items-center gap-1.5 bg-white border border-[#e0e0e8] text-[#1F1B2E] text-xs font-bold px-3 py-2 rounded-xl hover:bg-[#f6f6fa] transition-colors disabled:opacity-40';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        type="button"
        onClick={onExportExcel}
        disabled={disabled}
        className={btnClass}
        title="Exporter Excel"
      >
        {compact ? <FileSpreadsheet className="size-4" /> : (
          <>
            <FileSpreadsheet className="size-4" />
            Excel
          </>
        )}
      </button>
      <button
        type="button"
        onClick={onExportPdf}
        disabled={disabled}
        className={btnClass}
        title="Exporter PDF"
      >
        {compact ? <FileText className="size-4" /> : (
          <>
            <FileText className="size-4" />
            PDF
          </>
        )}
      </button>
      {onExportCsv && (
        <button
          type="button"
          onClick={onExportCsv}
          disabled={disabled}
          className={btnClass}
          title="Exporter CSV"
        >
          {compact ? '📥' : '📥 CSV'}
        </button>
      )}
    </div>
  );
}

export const DataTableExportButtons = memo(DataTableExportButtonsInner);
