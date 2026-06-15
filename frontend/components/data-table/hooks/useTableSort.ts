'use client';

import { useCallback, useState } from 'react';
import type { SortingState } from '@tanstack/react-table';

export function useTableSort(initialSorting: SortingState = []) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);

  const resetSorting = useCallback(() => setSorting([]), []);

  return { sorting, setSorting, resetSorting };
}
