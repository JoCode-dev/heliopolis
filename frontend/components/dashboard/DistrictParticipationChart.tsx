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
  BRAND_CHART_COLORS,
  CHART_ANIMATION,
  CHART_AXIS_TICK,
  CHART_BAR_PROPS,
  CHART_HEIGHT,
  districtChartConfig,
} from '@/lib/chart-colors';
import type { DashboardStats } from '@/types/dashboard-stats';
import { ChartCard, ChartEmpty, ChartStatChip } from './ChartCard';
import { ChartGradient } from './ChartGradients';

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
        icon="🛡️"
        accentColor={BRAND_CHART_COLORS.rouge}
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

  const totalRoutiers = districts.reduce((s, d) => s + d.routiers, 0);
  const totalSelectionnes = districts.reduce((s, d) => s + d.selectionnes, 0);
  const taux =
    totalRoutiers > 0
      ? Math.round((totalSelectionnes / totalRoutiers) * 100)
      : 0;

  return (
    <ChartCard
      title="Participation par district"
      icon="🛡️"
      accentColor={BRAND_CHART_COLORS.rouge}
      description={
        activeCampNom
          ? `Routiers vs sélectionnés — ${activeCampNom}`
          : 'Routiers vs sélectionnés'
      }
      footer={
        <>
          <ChartStatChip
            label="Routiers"
            value={totalRoutiers}
            color={BRAND_CHART_COLORS.rouge}
          />
          <ChartStatChip
            label="Sélectionnés"
            value={totalSelectionnes}
            color={BRAND_CHART_COLORS.vert}
          />
          <ChartStatChip label="Taux" value={`${taux}%`} />
        </>
      }
    >
      <ChartContainer
        config={districtChartConfig}
        className={`${CHART_HEIGHT} aspect-auto`}
      >
        <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barGap={4}>
          <ChartGradient
            id="fillRoutiers"
            from={BRAND_CHART_COLORS.rouge}
            to="#8e1a1a"
          />
          <ChartGradient
            id="fillSelectionnes"
            from={BRAND_CHART_COLORS.vert}
            to="#1a5021"
          />
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#ececf0" />
          <XAxis
            dataKey="district"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={48}
            tick={CHART_AXIS_TICK}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={32}
            tick={CHART_AXIS_TICK}
          />
          <ChartTooltip
            cursor={{ fill: '#f6f6fa', radius: 6 }}
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
            fill="url(#fillRoutiers)"
            radius={[6, 6, 0, 0]}
            {...CHART_BAR_PROPS}
            {...CHART_ANIMATION}
          />
          <Bar
            dataKey="selectionnes"
            fill="url(#fillSelectionnes)"
            radius={[6, 6, 0, 0]}
            {...CHART_BAR_PROPS}
            {...CHART_ANIMATION}
          />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}
