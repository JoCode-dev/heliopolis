'use client';

import { useMemo } from 'react';
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import type { UseDataTableOptions } from '../types';
import { useTableSort } from './useTableSort';

export function useDataTable<TData>({
  data,
  columns,
  pageSize = 10,
  page = 1,
  onPageChange,
  initialSorting = [],
  globalFilter = '',
}: UseDataTableOptions<TData>) {
  const { sorting, setSorting } = useTableSort(initialSorting);

  const pagination = useMemo(
    () => ({ pageIndex: Math.max(0, page - 1), pageSize }),
    [page, pageSize],
  );

  const table = useReactTable({
    data,
    columns: columns as ColumnDef<TData, unknown>[],
    state: { sorting, pagination, globalFilter },
    onSortingChange: setSorting,
    onPaginationChange: updater => {
      const next = typeof updater === 'function' ? updater(pagination) : updater;
      onPageChange?.(next.pageIndex + 1);
    },
    enableSorting: true,
    manualSorting: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
    manualPagination: false,
  });

  const filteredCount = table.getFilteredRowModel().rows.length;

  return {
    table,
    sorting,
    filteredCount,
    pageCount: table.getPageCount(),
  };
}
