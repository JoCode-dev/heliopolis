'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { campsChartConfig, CHART_ANIMATION } from '@/lib/chart-colors';
import type { DashboardStats } from '@/types/dashboard-stats';
import { ChartCard, ChartEmpty } from './ChartCard';

interface CampParticipantsChartProps {
  camps: DashboardStats['camps'];
}

export function CampParticipantsChart({ camps }: CampParticipantsChartProps) {
  if (camps.length === 0) {
    return (
      <ChartCard title="Participants par camp">
        <ChartEmpty message="Aucun camp ouvert" />
      </ChartCard>
    );
  }

  const data = camps.map((c) => ({
    camp: c.nom.length > 14 ? `${c.nom.slice(0, 13)}…` : c.nom,
    fullName: c.nom,
    participants: c.participants,
    statut: c.statut,
  }));

  return (
    <ChartCard title="Participants par camp" description="Camps ouverts et en cours">
      <ChartContainer
        config={campsChartConfig}
        className="h-[220px] w-full lg:h-[280px] aspect-auto"
      >
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="camp"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={44}
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
          <Bar
            dataKey="participants"
            fill="var(--color-participants)"
            radius={[4, 4, 0, 0]}
            {...CHART_ANIMATION}
          />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}
