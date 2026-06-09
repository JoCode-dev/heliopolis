'use client';

import { Cell, Label, Pie, PieChart } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  adhesionChartConfig,
  BRAND_CHART_COLORS,
  CHART_ANIMATION,
  CHART_HEIGHT,
} from '@/lib/chart-colors';
import type { DashboardStats } from '@/types/dashboard-stats';
import { ChartCard, ChartEmpty, ChartStatChip } from './ChartCard';

interface AdhesionStatusChartProps {
  adhesions: DashboardStats['adhesions'];
}

const SLICE_COLORS = {
  aJour: BRAND_CHART_COLORS.vert,
  nonAJour: BRAND_CHART_COLORS.rouge,
  enAttente: BRAND_CHART_COLORS.or,
} as const;

const SLICE_LABELS = {
  aJour: 'À jour',
  nonAJour: 'Non à jour',
  enAttente: 'En attente',
} as const;

export function AdhesionStatusChart({ adhesions }: AdhesionStatusChartProps) {
  const data = [
    { key: 'aJour', value: adhesions.aJour, fill: SLICE_COLORS.aJour },
    { key: 'nonAJour', value: adhesions.nonAJour, fill: SLICE_COLORS.nonAJour },
    { key: 'enAttente', value: adhesions.enAttente, fill: SLICE_COLORS.enAttente },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <ChartCard
        title="Adhésions gardiens"
        icon="🤝"
        accentColor={BRAND_CHART_COLORS.vert}
        description={`Année pastorale ${adhesions.annee}`}
      >
        <ChartEmpty message="Aucune adhésion enregistrée" icon="🤝" />
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
      icon="🤝"
      accentColor={BRAND_CHART_COLORS.vert}
      description={`Année ${adhesions.annee} · ${pct}% à jour`}
      footer={
        <>
          {data.map((d) => (
            <ChartStatChip
              key={d.key}
              label={SLICE_LABELS[d.key as keyof typeof SLICE_LABELS]}
              value={d.value}
              color={d.fill}
            />
          ))}
        </>
      }
    >
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <ChartContainer
          config={adhesionChartConfig}
          className={`${CHART_HEIGHT} sm:flex-1 aspect-auto`}
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="key" />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="key"
              innerRadius="58%"
              outerRadius="82%"
              paddingAngle={3}
              strokeWidth={0}
              {...CHART_ANIMATION}
            >
              {data.map((entry) => (
                <Cell key={entry.key} fill={entry.fill} />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (!viewBox || !('cx' in viewBox)) return null;
                  const { cx, cy } = viewBox;
                  return (
                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan
                        x={cx}
                        y={(cy ?? 0) - 6}
                        className="fill-[#1F1B2E] text-2xl font-black"
                      >
                        {pct}%
                      </tspan>
                      <tspan
                        x={cx}
                        y={(cy ?? 0) + 14}
                        className="fill-[#6b6b78] text-[10px]"
                      >
                        {adhesions.total} total
                      </tspan>
                    </text>
                  );
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </div>
    </ChartCard>
  );
}
