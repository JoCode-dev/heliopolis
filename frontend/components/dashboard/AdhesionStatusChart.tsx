'use client';

import {
  BRAND_CHART_COLORS,
} from '@/lib/chart-colors';
import type { DashboardStats } from '@/types/dashboard-stats';
import { ChartCard, ChartEmpty, ChartStatChip } from './ChartCard';
import { SegmentBar, SegmentLegend } from './chart-lists';

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
  const segments = [
    { key: 'aJour', value: adhesions.aJour, color: SLICE_COLORS.aJour, label: SLICE_LABELS.aJour },
    { key: 'nonAJour', value: adhesions.nonAJour, color: SLICE_COLORS.nonAJour, label: SLICE_LABELS.nonAJour },
    { key: 'enAttente', value: adhesions.enAttente, color: SLICE_COLORS.enAttente, label: SLICE_LABELS.enAttente },
  ].filter((s) => s.value > 0);

  if (segments.length === 0) {
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
      description={`Année ${adhesions.annee}`}
      footer={
        <>
          {segments.map((s) => (
            <ChartStatChip key={s.key} label={s.label} value={s.value} color={s.color} />
          ))}
        </>
      }
    >
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-4xl lg:text-5xl font-black text-[#1F1B2E] tabular-nums leading-none">
          {pct}%
        </span>
        <div>
          <p className="text-[13px] font-semibold text-[#2E7D32]">à jour</p>
          <p className="text-[11px] text-[#6b6b78]">{adhesions.total} gardiens</p>
        </div>
      </div>
      <SegmentBar segments={segments} total={adhesions.total} />
      <SegmentLegend segments={segments} total={adhesions.total} />
    </ChartCard>
  );
}
