'use client';
import React from 'react';

/** Wraps page content in the standard mobile layout: header + scrollable content + bottom nav */
export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-[#fafafa]">
      {children}
    </div>
  );
}

/** Standard status bar */
export function StatusBar() {
  return (
    <div className="h-9 flex justify-between items-center px-7 pt-2 text-[13px] font-semibold text-[#1F1B2E] flex-shrink-0 bg-white">
      <span>9:41</span>
      <div className="flex gap-1.5 items-center text-xs">
        <span>5G</span><span>📶</span><span>🔋</span>
      </div>
    </div>
  );
}

interface HeaderProps {
  title: string;
  sub?: string;
  variant?: 'violet' | 'rouge' | 'nuit' | 'sunset';
  onBack?: () => void;
  right?: React.ReactNode;
  children?: React.ReactNode;
}

const gradients = {
  violet:  'from-[#6A1B9A] to-[#4a1370]',
  rouge:   'from-[#E55A35] to-[#7A2820]',
  nuit:    'from-[#1F1B2E] to-[#2c1f4a]',
  sunset:  'from-[#FFB36B] to-[#7A2820]',
};

export function PageHeader({ title, sub, variant = 'violet', onBack, right, children }: HeaderProps) {
  return (
    <header className={`bg-gradient-to-br ${gradients[variant]} text-white px-4 pb-4 flex-shrink-0`}>
      <div className="flex items-center gap-2.5 mb-2">
        {onBack && (
          <button onClick={onBack} className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-base flex-shrink-0">
            ‹
          </button>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-bold">{title}</h1>
          {sub && <p className="text-xs opacity-85 mt-0.5">{sub}</p>}
        </div>
        {right}
      </div>
      {children}
    </header>
  );
}

export function ScrollContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex-1 overflow-y-auto p-4 bg-[#fafafa] ${className}`}>
      {children}
    </div>
  );
}
