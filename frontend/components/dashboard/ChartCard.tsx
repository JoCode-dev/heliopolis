'use client';

import type { ReactNode } from 'react';

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
      className={`relative bg-white border border-[#ececf0] rounded-2xl p-3 lg:p-4 shadow-sm overflow-hidden ${className}`}
    >
      <div
        className="absolute top-0 left-0 right-0 h-0.5 opacity-80"
        style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }}
      />
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          {icon && (
            <div
              className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl flex items-center justify-center text-sm lg:text-base flex-shrink-0"
              style={{ background: `${accentColor}18`, color: accentColor }}
            >
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-bold text-[13px] lg:text-sm text-[#1F1B2E] leading-tight">
              {title}
            </h3>
            {description && (
              <p className="text-[11px] text-[#6b6b78] mt-0.5 leading-snug">{description}</p>
            )}
          </div>
        </div>
        {action}
      </div>
      {children}
      {footer && (
        <div className="mt-3 pt-3 border-t border-[#f0f0f4] flex flex-wrap gap-1.5 lg:gap-2">
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
    <div className="inline-flex items-center gap-1.5 bg-[#f9f9fc] rounded-lg px-2 py-1 lg:px-2.5 lg:py-1.5 text-[10px] lg:text-[11px]">
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
    <div className="flex flex-col items-center justify-center gap-2 py-10 rounded-xl border border-dashed border-[#e6e6ea] bg-[#fafafc]">
      <span className="text-2xl opacity-40">{icon}</span>
      <p className="text-xs text-[#6b6b78] font-medium text-center px-4">{message}</p>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="space-y-3 py-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="flex justify-between mb-1.5">
            <div className="h-3.5 rounded bg-[#f0f0f4]" style={{ width: `${55 + i * 8}%` }} />
            <div className="h-3.5 w-10 rounded bg-[#f0f0f4]" />
          </div>
          <div className="h-2 rounded-full bg-[#f0f0f4]" />
        </div>
      ))}
    </div>
  );
}
