'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { Column } from '@tanstack/react-table';
import { cn } from '@/lib/utils';

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <span className={className}>{title}</span>;
  }

  const sorted = column.getIsSorted();

  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(sorted === 'asc')}
      className={cn(
        'flex items-center gap-1 font-semibold uppercase tracking-wide text-[#6b6b78] hover:text-[#1F1B2E] transition-colors',
        className,
      )}
    >
      {title}
      {sorted === 'desc' ? (
        <ArrowDown className="size-3.5" />
      ) : sorted === 'asc' ? (
        <ArrowUp className="size-3.5" />
      ) : (
        <ArrowUpDown className="size-3.5 opacity-50" />
      )}
    </button>
  );
}
