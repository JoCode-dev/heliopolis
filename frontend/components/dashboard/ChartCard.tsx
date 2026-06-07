'use client';

import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ChartCard({ title, description, action, children, className = '' }: ChartCardProps) {
  return (
    <div className={`bg-white border border-[#ececf0] rounded-2xl p-4 ${className}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="font-bold text-sm text-[#1F1B2E]">{title}</h3>
          {description && (
            <p className="text-[11px] text-[#6b6b78] mt-0.5 truncate">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function ChartEmpty({ message = 'Aucune donnée disponible' }: { message?: string }) {
  return (
    <div className="flex h-[220px] lg:h-[280px] items-center justify-center text-xs text-[#6b6b78]">
      {message}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="flex h-[220px] lg:h-[280px] items-center justify-center">
      <div className="h-full w-full animate-pulse rounded-xl bg-[#f0f0f4]" />
    </div>
  );
}
