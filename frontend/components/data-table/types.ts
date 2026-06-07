import type { ColumnDef, SortingState } from '@tanstack/react-table';

export type FilterValues = Record<string, string>;

export type SearchFilterConfig = {
  id: string;
  type: 'search';
  placeholder?: string;
  label?: string;
};

export type SelectFilterConfig = {
  id: string;
  type: 'select';
  label?: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  /** Réinitialise ces filtres quand la valeur change (ex. paroisse quand district change). */
  resetOnChange?: string[];
  disabled?: boolean;
};

export type ToggleFilterConfig = {
  id: string;
  type: 'toggle';
  label?: string;
  options: { value: string; label: string }[];
};

export type TableFilterConfig = SearchFilterConfig | SelectFilterConfig | ToggleFilterConfig;

export interface DataTableExportMeta<TData> {
  exportHeader?: string;
  exportValue?: (row: TData) => string | number | null | undefined;
}

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    exportHeader?: string;
    exportValue?: (row: TData) => string | number | null | undefined;
  }
}

export interface UseDataTableOptions<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  pageSize?: number;
  page?: number;
  onPageChange?: (page: number) => void;
  initialSorting?: SortingState;
  globalFilter?: string;
}

export interface ExportOptions {
  filename: string;
  title?: string;
}
