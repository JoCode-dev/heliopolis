'use client';

import { BRAND_CHART_COLORS } from '@/lib/chart-colors';
import type { DashboardStats } from '@/types/dashboard-stats';
import { ChartCard, ChartEmpty, ChartStatChip } from './ChartCard';
import { CampRow } from './chart-lists';

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
  const maxParticipants = Math.max(...camps.map((c) => c.participants), 1);

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
      <div>
        {sorted.map((c) => (
          <CampRow
            key={c.id}
            nom={c.nom}
            participants={c.participants}
            statut={c.statut}
            statutLabel={STATUT_LABELS[c.statut] ?? c.statut}
            maxParticipants={maxParticipants}
          />
        ))}
      </div>
    </ChartCard>
  );
}
