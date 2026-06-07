'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  CHART_ANIMATION,
  districtChartConfig,
} from '@/lib/chart-colors';
import type { DashboardStats } from '@/types/dashboard-stats';
import { ChartCard, ChartEmpty } from './ChartCard';

interface DistrictParticipationChartProps {
  districts: DashboardStats['districts'];
  activeCampNom?: string | null;
}

export function DistrictParticipationChart({
  districts,
  activeCampNom,
}: DistrictParticipationChartProps) {
  if (districts.length === 0) {
    return (
      <ChartCard
        title="Participation par district"
        description={activeCampNom ? `Camp : ${activeCampNom}` : undefined}
      >
        <ChartEmpty />
      </ChartCard>
    );
  }

  const data = districts.map((d) => ({
    district: d.nom.length > 12 ? `${d.nom.slice(0, 11)}…` : d.nom,
    fullName: d.nom,
    routiers: d.routiers,
    selectionnes: d.selectionnes,
  }));

  return (
    <ChartCard
      title="Participation par district"
      description={
        activeCampNom
          ? `Routiers vs sélectionnés — ${activeCampNom}`
          : 'Routiers vs sélectionnés'
      }
    >
      <ChartContainer
        config={districtChartConfig}
        className="h-[220px] w-full lg:h-[280px] aspect-auto"
      >
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="district"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={48}
          />
          <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={28} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) =>
                  (payload?.[0]?.payload as { fullName?: string })?.fullName ?? ''
                }
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar
            dataKey="routiers"
            fill="var(--color-routiers)"
            radius={[4, 4, 0, 0]}
            {...CHART_ANIMATION}
          />
          <Bar
            dataKey="selectionnes"
            fill="var(--color-selectionnes)"
            radius={[4, 4, 0, 0]}
            {...CHART_ANIMATION}
          />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}
