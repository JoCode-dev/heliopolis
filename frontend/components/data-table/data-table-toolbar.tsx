'use client';

import { memo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DataTableToolbarProps {
  title?: ReactNode;
  count?: number;
  actions?: ReactNode;
  filters?: ReactNode;
  exports?: ReactNode;
  className?: string;
}

function DataTableToolbarInner({
  title,
  count,
  actions,
  filters,
  exports,
  className,
}: DataTableToolbarProps) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {(title || actions || exports) && (
        <div className="flex items-center gap-2 flex-wrap">
          {title && (
            <h2 className="text-base font-black text-[#1F1B2E] flex-1 min-w-0">
              {title}
            </h2>
          )}
          {count != null && (
            <span className="text-[11px] text-[#9b9ba8] font-medium shrink-0">
              {count}
            </span>
          )}
          {exports}
          {actions}
        </div>
      )}
      {filters}
    </div>
  );
}

export const DataTableToolbar = memo(DataTableToolbarInner);
