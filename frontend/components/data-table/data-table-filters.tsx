'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { FilterValues, TableFilterConfig } from './types';

interface DataTableFiltersProps {
  configs: TableFilterConfig[];
  values: FilterValues;
  onChange: (id: string, value: string) => void;
  onReset?: () => void;
  hasActiveFilters?: boolean;
  className?: string;
}

const inputClass =
  'bg-white border border-[#e0e0e8] rounded-xl px-3 py-2 text-sm outline-none text-[#1F1B2E] focus:border-[#6A1B9A] transition min-w-0';

function DataTableFiltersInner({
  configs,
  values,
  onChange,
  onReset,
  hasActiveFilters,
  className,
}: DataTableFiltersProps) {
  const searchConfigs = configs.filter(c => c.type === 'search');
  const otherConfigs = configs.filter(c => c.type !== 'search');

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {searchConfigs.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2">
          {searchConfigs.map(config => (
            <div key={config.id} className="flex flex-1 items-center bg-[#f5f5fa] rounded-xl px-3 py-2 gap-2 min-w-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9b9ba8" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                value={values[config.id] ?? ''}
                onChange={e => onChange(config.id, e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#b0b0bc] min-w-0"
                placeholder={config.placeholder ?? 'Rechercher…'}
                aria-label={config.label ?? config.placeholder ?? 'Recherche'}
              />
              {(values[config.id] ?? '') !== '' && (
                <button
                  type="button"
                  onClick={() => onChange(config.id, '')}
                  className="text-[#b0b0bc] text-sm shrink-0"
                  aria-label="Effacer la recherche"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {otherConfigs.length > 0 && (
        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
          {otherConfigs.map(config => {
            if (config.type === 'toggle') {
              return (
                <div key={config.id} className="flex gap-1.5 shrink-0">
                  {config.options.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onChange(config.id, opt.value)}
                      className={cn(
                        'px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                        values[config.id] === opt.value
                          ? 'bg-[#1F1B2E] text-white'
                          : 'bg-white border border-[#e0e0e8] text-[#6b6b78] hover:border-[#1F1B2E] hover:text-[#1F1B2E]',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              );
            }

            if (config.type === 'select') {
              return (
                <select
                  key={config.id}
                  value={values[config.id] ?? ''}
                  onChange={e => onChange(config.id, e.target.value)}
                  disabled={config.disabled}
                  className={cn(inputClass, 'flex-1 disabled:opacity-50')}
                  aria-label={config.label ?? config.placeholder}
                >
                  <option value="">{config.placeholder ?? 'Tous'}</option>
                  {config.options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              );
            }

            return null;
          })}

          {hasActiveFilters && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#f6f6fa] text-[#6b6b78] hover:bg-[#ececf0] transition-colors shrink-0"
            >
              ✕ Effacer
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export const DataTableFilters = memo(DataTableFiltersInner);
