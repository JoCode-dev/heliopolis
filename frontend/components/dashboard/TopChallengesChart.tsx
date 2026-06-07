'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { CHART_ANIMATION, challengesChartConfig } from '@/lib/chart-colors';
import type { DashboardStats } from '@/types/dashboard-stats';
import { ChartCard, ChartEmpty } from './ChartCard';

interface TopChallengesChartProps {
  challenges: DashboardStats['challenges'];
}

export function TopChallengesChart({ challenges }: TopChallengesChartProps) {
  if (challenges.length === 0) {
    return (
      <ChartCard title="Défis les plus soumis">
        <ChartEmpty message="Aucun défi soumis" />
      </ChartCard>
    );
  }

  const data = challenges.map((c) => ({
    titre: c.titre.length > 28 ? `${c.titre.slice(0, 27)}…` : c.titre,
    fullTitre: c.titre,
    submissions: c.submissions,
  }));

  return (
    <ChartCard title="Défis les plus soumis" description="Top 5 par nombre de soumissions">
      <ChartContainer
        config={challengesChartConfig}
        className="h-[220px] w-full lg:h-[280px] aspect-auto"
      >
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
        >
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="titre"
            tickLine={false}
            axisLine={false}
            width={100}
            tick={{ fontSize: 10 }}
          />
          <ChartTooltip
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
            fill="var(--color-submissions)"
            radius={[0, 4, 4, 0]}
            {...CHART_ANIMATION}
          />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}
