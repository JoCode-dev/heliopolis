'use client';

import { Cell, Label, Pie, PieChart } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BRAND_CHART_COLORS,
  CAMP_PIE_COLORS,
  CHART_ANIMATION,
  CHART_SIZE,
} from '@/lib/chart-colors';
import type { DashboardStats } from '@/types/dashboard-stats';
import { ChartCard, ChartEmpty, ChartStatChip } from './ChartCard';

interface CampParticipantsChartProps {
  camps: DashboardStats['camps'];
}

const STATUT_LABELS: Record<string, string> = {
  OUVERT: 'Ouvert',
  EN_COURS: 'En cours',
  TERMINE: 'Terminé',
  BROUILLON: 'Brouillon',
};

export function CampParticipantsChart({ camps }: CampParticipantsChartProps) {
  if (camps.length === 0) {
    return (
      <ChartCard
        title="Participants par camp"
        icon="⛺"
        accentColor={BRAND_CHART_COLORS.or}
      >
        <ChartEmpty message="Aucun camp ouvert" icon="⛺" />
      </ChartCard>
    );
  }

  const sorted = [...camps].sort((a, b) => b.participants - a.participants);
  const totalParticipants = camps.reduce((s, c) => s + c.participants, 0);
  const activeCamps = camps.filter((c) =>
    ['OUVERT', 'EN_COURS'].includes(c.statut),
  ).length;

  const data = sorted.map((c, i) => ({
    key: c.id,
    nom: c.nom,
    participants: c.participants,
    statut: c.statut,
    fill: CAMP_PIE_COLORS[i % CAMP_PIE_COLORS.length],
  }));

  const chartConfig = Object.fromEntries(
    data.map((d) => [d.key, { label: d.nom, color: d.fill }]),
  );

  const hasData = totalParticipants > 0;

  return (
    <ChartCard
      title="Participants par camp"
      icon="⛺"
      accentColor={BRAND_CHART_COLORS.or}
      description="Camps ouverts et en cours"
      footer={
        <>
          <ChartStatChip
            label="Participants"
            value={totalParticipants}
            color={BRAND_CHART_COLORS.or}
          />
          <ChartStatChip label="Camps actifs" value={activeCamps} />
        </>
      }
    >
      <ChartContainer
        config={chartConfig}
        className={`${CHART_SIZE} mx-auto aspect-square max-w-[240px] sm:max-w-[260px]`}
      >
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideLabel
                nameKey="key"
                labelFormatter={(_, payload) => {
                  const item = payload?.[0]?.payload as {
                    nom?: string;
                    statut?: string;
                  };
                  const statut = item?.statut
                    ? STATUT_LABELS[item.statut] ?? item.statut
                    : '';
                  return statut ? `${item?.nom ?? ''} · ${statut}` : (item?.nom ?? '');
                }}
              />
            }
          />
          <Pie
            data={hasData ? data : data.map((d) => ({ ...d, participants: 1 }))}
            dataKey="participants"
            nameKey="key"
            innerRadius={hasData ? '52%' : '0%'}
            outerRadius="82%"
            paddingAngle={hasData ? 3 : 0}
            strokeWidth={2}
            stroke="#fff"
            {...CHART_ANIMATION}
          >
            {data.map((entry) => (
              <Cell
                key={entry.key}
                fill={hasData ? entry.fill : '#ececf0'}
              />
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
                      {totalParticipants}
                    </tspan>
                    <tspan
                      x={cx}
                      y={(cy ?? 0) + 14}
                      className="fill-[#6b6b78] text-[10px]"
                    >
                      participants
                    </tspan>
                  </text>
                );
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>

      <div className="space-y-2 mt-3">
        {data.map((d) => {
          const pct =
            totalParticipants > 0
              ? Math.round((d.participants / totalParticipants) * 100)
              : 0;
          return (
            <div key={d.key} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: d.fill }}
                />
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-[#1F1B2E] leading-snug truncate">
                    {d.nom}
                  </p>
                  <p className="text-[10px] text-[#6b6b78]">
                    {STATUT_LABELS[d.statut] ?? d.statut}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 tabular-nums">
                <span className="text-sm font-black text-[#1F1B2E]">{d.participants}</span>
                <span className="text-[10px] text-[#6b6b78] w-7 text-right">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}
