'use client';

import { BRAND_CHART_COLORS } from '@/lib/chart-colors';
import type { DashboardStats } from '@/types/dashboard-stats';
import { ChartCard, ChartEmpty, ChartStatChip } from './ChartCard';

interface TopChallengesChartProps {
  challenges: DashboardStats['challenges'];
}

const ROW_COLORS = [
  '#6A1B9A', '#E55A35', '#D9A441', '#2E7D32', '#1565C0',
];

export function TopChallengesChart({ challenges }: TopChallengesChartProps) {
  if (challenges.length === 0) {
    return (
      <ChartCard title="Quêtes les plus soumises" icon="🏆" accentColor={BRAND_CHART_COLORS.violet}>
        <ChartEmpty message="Aucune quête soumise" icon="🏆" />
      </ChartCard>
    );
  }

  const totalSubmissions = challenges.reduce((s, c) => s + c.submissions, 0);
  const maxSubmissions   = Math.max(...challenges.map(c => c.submissions), 1);

  return (
    <ChartCard
      title="Quêtes les plus soumises"
      icon="🏆"
      accentColor={BRAND_CHART_COLORS.violet}
      description="Top 5 par nombre de soumissions"
      footer={
        <>
          <ChartStatChip label="Total"  value={totalSubmissions} />
          <ChartStatChip label="Leader" value={challenges[0]?.submissions ?? 0} color={BRAND_CHART_COLORS.violet} />
        </>
      }
    >
      <div className="flex flex-col gap-3 py-1">
        {challenges.map((c, i) => {
          const pct     = totalSubmissions > 0 ? Math.round((c.submissions / totalSubmissions) * 100) : 0;
          const barPct  = Math.round((c.submissions / maxSubmissions) * 100);
          const color   = ROW_COLORS[i % ROW_COLORS.length];
          const isFirst = i === 0;

          return (
            <div key={c.id} className="flex flex-col gap-1">
              {/* Titre + valeur */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black flex-shrink-0 text-white"
                    style={{ backgroundColor: color }}
                  >
                    {i + 1}
                  </span>
                  <span className={`text-[12px] leading-snug truncate ${isFirst ? 'font-bold text-[#1F1B2E]' : 'font-medium text-[#4b4b5a]'}`}>
                    {c.titre}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 flex-shrink-0 tabular-nums">
                  <span className={`font-black ${isFirst ? 'text-base' : 'text-sm'} text-[#1F1B2E]`}>{c.submissions}</span>
                  <span className="text-[10px] text-[#9b9ba8]">{pct}%</span>
                </div>
              </div>
              {/* Barre */}
              <div className="h-1.5 w-full rounded-full bg-[#f0f0f4] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${barPct}%`, backgroundColor: color, opacity: isFirst ? 1 : 0.6 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}
