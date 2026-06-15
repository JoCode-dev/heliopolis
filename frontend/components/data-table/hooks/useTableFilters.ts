'use client';

import { useCallback, useMemo, useState } from 'react';
import type { FilterValues, TableFilterConfig } from '../types';

function buildInitialValues(configs: TableFilterConfig[]): FilterValues {
  const values: FilterValues = {};
  for (const config of configs) {
    if (config.type === 'toggle') {
      values[config.id] = config.options[0]?.value ?? '';
    } else {
      values[config.id] = '';
    }
  }
  return values;
}

export function useTableFilters(
  configs: TableFilterConfig[],
  onChange?: () => void,
) {
  const [values, setValues] = useState<FilterValues>(() => buildInitialValues(configs));

  const setFilter = useCallback(
    (id: string, value: string) => {
      setValues(prev => {
        const next = { ...prev, [id]: value };
        const config = configs.find(c => c.id === id);
        if (config?.type === 'select' && config.resetOnChange) {
          for (const resetId of config.resetOnChange) {
            next[resetId] = '';
          }
        }
        return next;
      });
      onChange?.();
    },
    [configs, onChange],
  );

  const resetFilters = useCallback(() => {
    setValues(buildInitialValues(configs));
    onChange?.();
  }, [configs, onChange]);

  const hasActiveFilters = useMemo(() => {
    return configs.some(config => {
      const value = values[config.id] ?? '';
      if (config.type === 'toggle') {
        return value !== (config.options[0]?.value ?? '');
      }
      return value !== '';
    });
  }, [configs, values]);

  return {
    values,
    setFilter,
    resetFilters,
    hasActiveFilters,
    search: values.search ?? '',
  };
}
