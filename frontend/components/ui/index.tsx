'use client';
import React from 'react';

// ─── Button ───────────────────────────────────────────────────────────────────
type BtnVariant = 'rouge' | 'violet' | 'or' | 'vert' | 'ghost' | 'nuit' | 'sunset';
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  full?: boolean;
}

const btnClasses: Record<BtnVariant, string> = {
  rouge:  'bg-[#C62828] text-white shadow-sm shadow-[#C62828]/20 enabled:hover:bg-[#b51d1d] enabled:hover:shadow-md enabled:hover:shadow-[#C62828]/30 enabled:hover:-translate-y-px',
  violet: 'bg-[#6A1B9A] text-white shadow-sm shadow-[#6A1B9A]/20 enabled:hover:bg-[#5a1280] enabled:hover:shadow-md enabled:hover:shadow-[#6A1B9A]/30 enabled:hover:-translate-y-px',
  or:     'bg-[#D9A441] text-white shadow-sm shadow-[#D9A441]/20 enabled:hover:bg-[#c49338] enabled:hover:shadow-md enabled:hover:shadow-[#D9A441]/30 enabled:hover:-translate-y-px',
  vert:   'bg-[#2E7D32] text-white shadow-sm shadow-[#2E7D32]/20 enabled:hover:bg-[#256128] enabled:hover:shadow-md enabled:hover:shadow-[#2E7D32]/30 enabled:hover:-translate-y-px',
  ghost:  'bg-white border border-[#e0e0ea] text-[#1F1B2E] enabled:hover:bg-[#f5f5fb] enabled:hover:border-[#c8c8d8] enabled:hover:shadow-sm',
  nuit:   'bg-[#1F1B2E] text-white shadow-sm shadow-[#1F1B2E]/20 enabled:hover:bg-[#2c2640] enabled:hover:shadow-md enabled:hover:shadow-[#1F1B2E]/25 enabled:hover:-translate-y-px',
  sunset: 'bg-gradient-to-r from-[#F58A4B] to-[#C62828] text-white shadow-sm shadow-[#C62828]/20 enabled:hover:shadow-md enabled:hover:shadow-[#C62828]/30 enabled:hover:-translate-y-px',
};

export function Button({ variant = 'rouge', full = true, className = '', children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-150 disabled:opacity-60 ${btnClasses[variant]} ${full ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
export function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3.5 py-3 border border-[#e6e6ea] rounded-xl text-sm font-sans focus:outline-none focus:border-[#6A1B9A] transition ${className}`}
    />
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────
export function Select({ className = '', children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full px-3.5 py-3 border border-[#e6e6ea] rounded-xl text-sm font-sans focus:outline-none focus:border-[#6A1B9A] bg-white transition ${className}`}
    >
      {children}
    </select>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl p-3.5 shadow-sm border border-[#ececf0] ${className}`}>
      {children}
    </div>
  );
}

// ─── Pill ────────────────────────────────────────────────────────────────────
type PillVariant = 'rouge' | 'violet' | 'or' | 'vert' | 'gris';
const pillBase = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold';
const pillMap: Record<PillVariant, string> = {
  rouge:  'bg-[#ffe6e6] text-[#C62828]',
  violet: 'bg-[#f0e3ff] text-[#6A1B9A]',
  or:     'bg-[#fff3d6] text-[#9c7218]',
  vert:   'bg-[#e1f4e3] text-[#2E7D32]',
  gris:   'bg-[#f3f3f5] text-[#6b6b78]',
};
export function Pill({ variant = 'gris', solid, children, className = '' }: {
  variant?: PillVariant; solid?: boolean; children: React.ReactNode; className?: string;
}) {
  const solidMap: Record<PillVariant, string> = {
    rouge: 'bg-[#C62828] text-white', violet: 'bg-[#6A1B9A] text-white',
    or: 'bg-[#D9A441] text-white', vert: 'bg-[#2E7D32] text-white', gris: 'bg-[#6b6b78] text-white',
  };
  return <span className={`${pillBase} ${solid ? solidMap[variant] : pillMap[variant]} ${className}`}>{children}</span>;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ initials, size = 42, className = '' }: { initials: string; size?: number; className?: string }) {
  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 bg-gradient-to-br from-[#6A1B9A] to-[#C62828] ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

// ─── Progress ─────────────────────────────────────────────────────────────────
export function Progress({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  return (
    <div className="h-1.5 bg-[#ececf0] rounded-full overflow-hidden">
      <div className="h-full bg-gradient-to-r from-[#F58A4B] to-[#C62828] rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Stat ────────────────────────────────────────────────────────────────────
export function Stat({ value, label, variant = 'violet' }: { value: string | number; label: string; variant?: 'violet' | 'rouge' | 'or' | 'vert' }) {
  const color = { violet: '#6A1B9A', rouge: '#C62828', or: '#9c7218', vert: '#2E7D32' }[variant];
  return (
    <div className="bg-white rounded-2xl p-3.5 border border-[#ececf0]">
      <div className="text-2xl font-black" style={{ color }}>{value}</div>
      <div className="text-xs text-[#6b6b78] uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  );
}

// ─── Section title ────────────────────────────────────────────────────────────
export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center text-sm font-bold text-[#1F1B2E] mt-4 mb-2.5">
      <span>{children}</span>
      {action}
    </div>
  );
}

// ─── Info banner ─────────────────────────────────────────────────────────────
export function InfoBanner({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 items-start bg-gradient-to-r from-[#6A1B9A]/8 to-[#C62828]/8 border border-[#6A1B9A]/20 rounded-xl p-2.5 mb-3.5 text-xs text-[#1F1B2E]">
      <span className="text-base flex-shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

// ─── Toggle ──────────────────────────────────────────────────────────────────
export function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${on ? 'bg-[#2E7D32]' : 'bg-[#e6e6ea]'}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${on ? 'left-5' : 'left-0.5'}`} />
    </div>
  );
}
