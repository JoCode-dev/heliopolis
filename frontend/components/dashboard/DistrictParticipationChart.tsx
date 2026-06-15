'use client';

import { BRAND_CHART_COLORS } from '@/lib/chart-colors';
import type { DashboardStats } from '@/types/dashboard-stats';
import { ChartCard, ChartEmpty, ChartStatChip } from './ChartCard';
import {
  ChartLegendRow,
  DistrictRow,
  ExpandToggle,
  ScrollableList,
  useIsMobile,
  useVisibleItems,
} from './chart-lists';

interface DistrictParticipationChartProps {
  districts: DashboardStats['districts'];
  activeCampNom?: string | null;
  compact?: boolean;
}

const MOBILE_LIMIT = 6;

export function DistrictParticipationChart({
  districts,
  activeCampNom,
  compact,
}: DistrictParticipationChartProps) {
  const isMobile = useIsMobile();
  const sorted = [...districts].sort((a, b) => b.routiers - a.routiers);
  const { visible, expanded, setExpanded, hiddenCount } = useVisibleItems(
    sorted,
    MOBILE_LIMIT,
    compact || isMobile,
  );

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

  const totalRoutiers = districts.reduce((s, d) => s + d.routiers, 0);
  const totalSelectionnes = districts.reduce((s, d) => s + d.selectionnes, 0);
  const taux =
    totalRoutiers > 0
      ? Math.round((totalSelectionnes / totalRoutiers) * 100)
      : 0;
  const maxRoutiers = Math.max(...districts.map((d) => d.routiers), 1);

  return (
    <ChartCard
      title="Participation par district"
      icon="🛡️"
      accentColor={BRAND_CHART_COLORS.rouge}
      description={
        activeCampNom
          ? `Routiers → sélectionnés · ${activeCampNom}`
          : 'Routiers → sélectionnés par district'
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
      <ChartLegendRow
        items={[
          { label: 'Routiers', color: BRAND_CHART_COLORS.rouge },
          { label: 'Sélectionnés', color: BRAND_CHART_COLORS.vert },
        ]}
      />
      <ScrollableList className={compact ? '' : 'lg:max-h-none'}>
        {visible.map((d) => (
          <DistrictRow
            key={d.id}
            nom={d.nom}
            routiers={d.routiers}
            selectionnes={d.selectionnes}
            maxRoutiers={maxRoutiers}
          />
        ))}
      </ScrollableList>
      <ExpandToggle
        expanded={expanded}
        onToggle={() => setExpanded((v) => !v)}
        hiddenCount={hiddenCount}
      />
    </ChartCard>
  );
}
