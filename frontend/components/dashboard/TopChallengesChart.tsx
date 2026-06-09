'use client';

import { BRAND_CHART_COLORS } from '@/lib/chart-colors';
import type { DashboardStats } from '@/types/dashboard-stats';
import { ChartCard, ChartEmpty, ChartStatChip } from './ChartCard';
import { RankedRow } from './chart-lists';

interface TopChallengesChartProps {
  challenges: DashboardStats['challenges'];
}

export function TopChallengesChart({ challenges }: TopChallengesChartProps) {
  if (challenges.length === 0) {
    return (
      <ChartCard
        title="Défis les plus soumis"
        icon="🏆"
        accentColor={BRAND_CHART_COLORS.violet}
      >
        <ChartEmpty message="Aucun défi soumis" icon="🏆" />
      </ChartCard>
    );
  }

  const totalSubmissions = challenges.reduce((s, c) => s + c.submissions, 0);
  const topSubmissions = challenges[0]?.submissions ?? 0;
  const maxSubmissions = Math.max(...challenges.map((c) => c.submissions), 1);

  return (
    <ChartCard
      title="Défis les plus soumis"
      icon="🏆"
      accentColor={BRAND_CHART_COLORS.violet}
      description="Top 5 par nombre de soumissions"
      footer={
        <>
          <ChartStatChip label="Total" value={totalSubmissions} />
          <ChartStatChip
            label="Leader"
            value={topSubmissions}
            color={BRAND_CHART_COLORS.violet}
          />
        </>
      }
    >
      <div>
        {challenges.map((c, i) => (
          <RankedRow
            key={c.id}
            rank={i + 1}
            label={c.titre}
            value={c.submissions}
            max={maxSubmissions}
            color={BRAND_CHART_COLORS.violet}
          />
        ))}
      </div>
    </ChartCard>
  );
}
