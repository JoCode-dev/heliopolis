'use client';

import { Cell, Pie, PieChart } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  adhesionChartConfig,
  BRAND_CHART_COLORS,
  CHART_ANIMATION,
} from '@/lib/chart-colors';
import type { DashboardStats } from '@/types/dashboard-stats';
import { ChartCard, ChartEmpty } from './ChartCard';

interface AdhesionStatusChartProps {
  adhesions: DashboardStats['adhesions'];
}

const SLICE_COLORS = {
  aJour: BRAND_CHART_COLORS.vert,
  nonAJour: BRAND_CHART_COLORS.rouge,
  enAttente: BRAND_CHART_COLORS.or,
} as const;

export function AdhesionStatusChart({ adhesions }: AdhesionStatusChartProps) {
  const data = [
    { key: 'aJour', value: adhesions.aJour, fill: SLICE_COLORS.aJour },
    { key: 'nonAJour', value: adhesions.nonAJour, fill: SLICE_COLORS.nonAJour },
    { key: 'enAttente', value: adhesions.enAttente, fill: SLICE_COLORS.enAttente },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <ChartCard title="Adhésions gardiens" description={`Année pastorale ${adhesions.annee}`}>
        <ChartEmpty message="Aucune adhésion enregistrée" />
      </ChartCard>
    );
  }

  const pct =
    adhesions.total > 0
      ? Math.round((adhesions.aJour / adhesions.total) * 100)
      : 0;

  return (
    <ChartCard
      title="Adhésions gardiens"
      description={`Année ${adhesions.annee} · ${pct}% à jour`}
    >
      <ChartContainer
        config={adhesionChartConfig}
        className="h-[220px] w-full lg:h-[280px] aspect-auto"
      >
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="key" />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="key"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            strokeWidth={2}
            {...CHART_ANIMATION}
          >
            {data.map((entry) => (
              <Cell key={entry.key} fill={entry.fill} />
            ))}
          </Pie>
          <ChartLegend content={<ChartLegendContent nameKey="key" />} />
        </PieChart>
      </ChartContainer>
    </ChartCard>
  );
}
