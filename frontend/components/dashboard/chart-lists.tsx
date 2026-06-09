'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { BRAND_CHART_COLORS } from '@/lib/chart-colors';

export function useIsMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [breakpoint]);

  return isMobile;
}

export function ChartLegendRow({
  items,
}: {
  items: Array<{ label: string; color: string }>;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 text-[11px] text-[#6b6b78]">
          <span
            className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </div>
      ))}
    </div>
  );
}

export function ScrollableList({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-y-auto overscroll-contain -mx-1 px-1 ${className}`}
      style={{ maxHeight: 'min(360px, 55vh)' }}
    >
      {children}
    </div>
  );
}

interface DistrictRowProps {
  nom: string;
  routiers: number;
  selectionnes: number;
  maxRoutiers: number;
}

export function DistrictRow({ nom, routiers, selectionnes, maxRoutiers }: DistrictRowProps) {
  const barWidth = maxRoutiers > 0 ? (routiers / maxRoutiers) * 100 : 0;
  const selectedPct = routiers > 0 ? (selectionnes / routiers) * 100 : 0;
  const transmitted = selectionnes > 0;

  return (
    <div className="py-2.5 border-b border-[#f0f0f4] last:border-0">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-[13px] font-semibold text-[#1F1B2E] leading-snug min-w-0">
          {nom}
        </p>
        <div className="flex items-center gap-1.5 flex-shrink-0 text-[11px] tabular-nums">
          <span className="font-bold text-[#C62828]">{routiers}</span>
          <span className="text-[#d0d0d8]">→</span>
          <span
            className="font-bold"
            style={{ color: transmitted ? BRAND_CHART_COLORS.vert : '#6b6b78' }}
          >
            {selectionnes}
          </span>
        </div>
      </div>
      <div className="h-2 bg-[#f0f0f4] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full flex overflow-hidden transition-all duration-500"
          style={{ width: `${barWidth}%` }}
        >
          {selectionnes > 0 && (
            <div
              className="h-full"
              style={{
                width: `${selectedPct}%`,
                backgroundColor: BRAND_CHART_COLORS.vert,
              }}
            />
          )}
          <div
            className="h-full flex-1"
            style={{ backgroundColor: BRAND_CHART_COLORS.rouge }}
          />
        </div>
      </div>
    </div>
  );
}

interface RankedRowProps {
  rank: number;
  label: string;
  value: number;
  max: number;
  color: string;
}

const RANK_STYLES: Record<number, string> = {
  1: 'bg-[#6A1B9A] text-white',
  2: 'bg-[#8e4ec0] text-white',
  3: 'bg-[#b388d9] text-white',
};

export function RankedRow({ rank, label, value, max, color }: RankedRowProps) {
  const pct = max > 0 ? (value / max) * 100 : 0;

  return (
    <div className="flex items-center gap-2.5 py-2.5 border-b border-[#f0f0f4] last:border-0">
      <span
        className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black flex-shrink-0 ${
          RANK_STYLES[rank] ?? 'bg-[#f0f0f4] text-[#6b6b78]'
        }`}
      >
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[#1F1B2E] leading-snug line-clamp-2">
          {label}
        </p>
        <div className="h-1.5 bg-[#f0f0f4] rounded-full mt-1.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      </div>
      <span
        className="text-sm font-black tabular-nums flex-shrink-0 min-w-[1.5rem] text-right"
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
}

interface CampRowProps {
  nom: string;
  participants: number;
  statut: string;
  statutLabel: string;
  maxParticipants: number;
}

const STATUT_COLORS: Record<string, string> = {
  EN_COURS: BRAND_CHART_COLORS.or,
  OUVERT: BRAND_CHART_COLORS.vert,
  TERMINE: '#6b6b78',
  BROUILLON: '#9e9eaa',
};

export function CampRow({
  nom,
  participants,
  statut,
  statutLabel,
  maxParticipants,
}: CampRowProps) {
  const pct = maxParticipants > 0 ? (participants / maxParticipants) * 100 : 0;
  const accent = STATUT_COLORS[statut] ?? BRAND_CHART_COLORS.or;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-[#f0f0f4] last:border-0">
      <div
        className="w-1 self-stretch rounded-full flex-shrink-0 min-h-[2.5rem]"
        style={{ backgroundColor: accent }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#1F1B2E] leading-snug">{nom}</p>
        <div className="flex items-center gap-2 mt-1">
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${accent}18`, color: accent }}
          >
            {statutLabel}
          </span>
          <div className="flex-1 h-1.5 bg-[#f0f0f4] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: accent }}
            />
          </div>
        </div>
      </div>
      <span
        className="text-xl font-black tabular-nums flex-shrink-0"
        style={{ color: accent }}
      >
        {participants}
      </span>
    </div>
  );
}

interface SegmentBarProps {
  segments: Array<{ key: string; value: number; color: string; label: string }>;
  total: number;
}

export function SegmentBar({ segments, total }: SegmentBarProps) {
  return (
    <div className="h-3 rounded-full overflow-hidden flex bg-[#f0f0f4]">
      {segments.map((s) => {
        const pct = total > 0 ? (s.value / total) * 100 : 0;
        if (pct <= 0) return null;
        return (
          <div
            key={s.key}
            className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
            style={{ width: `${pct}%`, backgroundColor: s.color }}
            title={`${s.label}: ${s.value}`}
          />
        );
      })}
    </div>
  );
}

export function SegmentLegend({ segments, total }: SegmentBarProps) {
  return (
    <div className="space-y-2 mt-4">
      {segments.map((s) => {
        const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
        return (
          <div key={s.key} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-[13px] text-[#1F1B2E] font-medium">{s.label}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 tabular-nums">
              <span className="text-sm font-black text-[#1F1B2E]">{s.value}</span>
              <span className="text-[11px] text-[#6b6b78] w-8 text-right">{pct}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ExpandToggle({
  expanded,
  onToggle,
  hiddenCount,
}: {
  expanded: boolean;
  onToggle: () => void;
  hiddenCount: number;
}) {
  if (hiddenCount <= 0) return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full mt-2 py-2 text-[12px] font-semibold text-[#6A1B9A] hover:bg-[#f6f0ff] rounded-xl transition-colors"
    >
      {expanded ? 'Réduire' : `Voir ${hiddenCount} de plus`}
    </button>
  );
}

export function useVisibleItems<T>(items: T[], limit: number, compact?: boolean) {
  const [expanded, setExpanded] = useState(false);
  const effectiveLimit = compact && !expanded ? limit : items.length;
  const visible = items.slice(0, effectiveLimit);
  const hiddenCount = compact && !expanded ? Math.max(0, items.length - limit) : 0;

  return { visible, expanded, setExpanded, hiddenCount };
}
