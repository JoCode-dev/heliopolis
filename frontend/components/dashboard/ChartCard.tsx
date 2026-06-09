'use client';

import type { ReactNode } from 'react';
import { CHART_HEIGHT } from '@/lib/chart-colors';

interface ChartCardProps {
  title: string;
  description?: string;
  icon?: string;
  accentColor?: string;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ChartCard({
  title,
  description,
  icon,
  accentColor = '#6A1B9A',
  action,
  footer,
  children,
  className = '',
}: ChartCardProps) {
  return (
    <div
      className={`group relative bg-white border border-[#ececf0] rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-[#e0e0e8] transition-all duration-200 overflow-hidden ${className}`}
    >
      <div
        className="absolute top-0 left-0 right-0 h-0.5 opacity-80"
        style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }}
      />
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          {icon && (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 shadow-sm"
              style={{ background: `${accentColor}18`, color: accentColor }}
            >
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-[#1F1B2E] leading-tight">{title}</h3>
            {description && (
              <p className="text-[11px] text-[#6b6b78] mt-0.5 line-clamp-2">{description}</p>
            )}
          </div>
        </div>
        {action}
      </div>
      {children}
      {footer && (
        <div className="mt-3 pt-3 border-t border-[#f0f0f4] flex flex-wrap gap-2">
          {footer}
        </div>
      )}
    </div>
  );
}

export function ChartStatChip({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-[#f9f9fc] rounded-lg px-2.5 py-1.5 text-[11px]">
      {color && (
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="text-[#6b6b78]">{label}</span>
      <span className="font-bold text-[#1F1B2E] tabular-nums">{value}</span>
    </div>
  );
}

export function ChartEmpty({
  message = 'Aucune donnée disponible',
  icon = '📊',
}: {
  message?: string;
  icon?: string;
}) {
  return (
    <div
      className={`${CHART_HEIGHT} flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#e6e6ea] bg-[#fafafc]`}
    >
      <span className="text-2xl opacity-40">{icon}</span>
      <p className="text-xs text-[#6b6b78] font-medium">{message}</p>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className={`${CHART_HEIGHT} relative overflow-hidden rounded-xl bg-[#f4f4f8]`}>
      <div className="absolute inset-0 animate-pulse">
        <div className="absolute bottom-0 left-[8%] w-[12%] h-[45%] bg-[#e8e8ee] rounded-t-md" />
        <div className="absolute bottom-0 left-[24%] w-[12%] h-[70%] bg-[#e8e8ee] rounded-t-md" />
        <div className="absolute bottom-0 left-[40%] w-[12%] h-[55%] bg-[#e8e8ee] rounded-t-md" />
        <div className="absolute bottom-0 left-[56%] w-[12%] h-[80%] bg-[#e8e8ee] rounded-t-md" />
        <div className="absolute bottom-0 left-[72%] w-[12%] h-[35%] bg-[#e8e8ee] rounded-t-md" />
      </div>
    </div>
  );
}
