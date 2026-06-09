'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BRAND_CHART_COLORS,
  CHART_ANIMATION,
  CHART_AXIS_TICK,
  CHART_BAR_PROPS,
  CHART_HEIGHT,
  challengesChartConfig,
} from '@/lib/chart-colors';
import type { DashboardStats } from '@/types/dashboard-stats';
import { ChartCard, ChartEmpty, ChartStatChip } from './ChartCard';
import { ChartGradient } from './ChartGradients';

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

  const data = challenges.map((c, i) => ({
    titre: c.titre.length > 22 ? `${c.titre.slice(0, 21)}…` : c.titre,
    fullTitre: c.titre,
    submissions: c.submissions,
    rank: i + 1,
  }));

  const totalSubmissions = challenges.reduce((s, c) => s + c.submissions, 0);
  const topSubmissions = challenges[0]?.submissions ?? 0;

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
      <ChartContainer
        config={challengesChartConfig}
        className={`${CHART_HEIGHT} aspect-auto`}
      >
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
        >
          <ChartGradient
            id="fillSubmissions"
            from={BRAND_CHART_COLORS.violet}
            to="#3d1163"
            direction="horizontal"
          />
          <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#ececf0" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            tick={CHART_AXIS_TICK}
          />
          <YAxis
            type="category"
            dataKey="titre"
            tickLine={false}
            axisLine={false}
            width={108}
            tick={CHART_AXIS_TICK}
          />
          <ChartTooltip
            cursor={{ fill: '#f6f6fa', radius: 6 }}
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) =>
                  (payload?.[0]?.payload as { fullTitre?: string })?.fullTitre ?? ''
                }
              />
            }
          />
          <Bar
            dataKey="submissions"
            fill="url(#fillSubmissions)"
            radius={[0, 6, 6, 0]}
            {...CHART_BAR_PROPS}
            {...CHART_ANIMATION}
          />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}
