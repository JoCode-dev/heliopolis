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
  campsChartConfig,
} from '@/lib/chart-colors';
import type { DashboardStats } from '@/types/dashboard-stats';
import { ChartCard, ChartEmpty, ChartStatChip } from './ChartCard';
import { ChartGradient } from './ChartGradients';

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

  const data = camps.map((c) => ({
    camp: c.nom.length > 14 ? `${c.nom.slice(0, 13)}…` : c.nom,
    fullName: c.nom,
    participants: c.participants,
    statut: c.statut,
  }));

  const totalParticipants = camps.reduce((s, c) => s + c.participants, 0);
  const activeCamps = camps.filter((c) =>
    ['OUVERT', 'EN_COURS'].includes(c.statut),
  ).length;

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
        config={campsChartConfig}
        className={`${CHART_HEIGHT} aspect-auto`}
      >
        <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <ChartGradient
            id="fillParticipants"
            from={BRAND_CHART_COLORS.or}
            to="#9c7218"
          />
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#ececf0" />
          <XAxis
            dataKey="camp"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={44}
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
                labelFormatter={(_, payload) => {
                  const item = payload?.[0]?.payload as {
                    fullName?: string;
                    statut?: string;
                  };
                  const statut = item?.statut
                    ? STATUT_LABELS[item.statut] ?? item.statut
                    : '';
                  return statut
                    ? `${item?.fullName ?? ''} · ${statut}`
                    : (item?.fullName ?? '');
                }}
              />
            }
          />
          <Bar
            dataKey="participants"
            fill="url(#fillParticipants)"
            radius={[6, 6, 0, 0]}
            {...CHART_BAR_PROPS}
            {...CHART_ANIMATION}
          />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}
