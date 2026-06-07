'use client';

import { flexRender, type Table as TanstackTable } from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pagination } from '@/components/ui/Pagination';

interface DataTableProps<TData> {
  table: TanstackTable<TData>;
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  emptyMessage?: string;
  className?: string;
  hideOnMobile?: boolean;
  hidePagination?: boolean;
}

export function DataTable<TData>({
  table,
  page,
  perPage,
  onPageChange,
  totalItems,
  emptyMessage = 'Aucun résultat',
  className,
  hideOnMobile = true,
  hidePagination = false,
}: DataTableProps<TData>) {
  const rows = table.getRowModel().rows;
  const count = totalItems ?? table.getFilteredRowModel().rows.length;

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[#6b6b78]">
        <p className="font-semibold text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn(hideOnMobile && 'hidden lg:block', className)}>
      <div className="bg-white border border-[#ececf0] rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id} className="bg-[#f9f9fc] hover:bg-[#f9f9fc] border-b border-[#ececf0]">
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    className="h-10 px-3 text-left align-middle text-xs font-semibold whitespace-nowrap text-[#6b6b78] uppercase tracking-wide"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.id} className="border-b border-[#f0f0f4] hover:bg-[#fafafc]">
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id} className="px-3 py-2.5 text-xs">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!hidePagination && (
        <Pagination
          page={page}
          totalItems={count}
          perPage={perPage}
          onChange={onPageChange}
        />
      )}
    </div>
  );
}
