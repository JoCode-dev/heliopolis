'use client';

import type { DashboardStats } from '@/types/dashboard-stats';
import { AdhesionStatusChart } from './AdhesionStatusChart';
import { CampParticipantsChart } from './CampParticipantsChart';
import { ChartSkeleton } from './ChartCard';
import { DistrictParticipationChart } from './DistrictParticipationChart';
import { TopChallengesChart } from './TopChallengesChart';

interface DashboardChartsSectionProps {
  data: DashboardStats | null;
  loading?: boolean;
  compact?: boolean;
}

function ChartsSkeleton({ compact }: { compact?: boolean }) {
  const gridClass = compact
    ? 'grid grid-cols-1 lg:grid-cols-2 gap-4'
    : 'grid grid-cols-1 lg:grid-cols-2 gap-5';

  return (
    <div className={gridClass}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white border border-[#ececf0] rounded-2xl p-4">
          <div className="h-4 w-40 animate-pulse rounded bg-[#f0f0f4] mb-3" />
          <ChartSkeleton />
        </div>
      ))}
    </div>
  );
}

export function DashboardChartsSection({
  data,
  loading,
  compact,
}: DashboardChartsSectionProps) {
  if (loading || !data) {
    return <ChartsSkeleton compact={compact} />;
  }

  const gridClass = compact
    ? 'grid grid-cols-1 lg:grid-cols-2 gap-4'
    : 'grid grid-cols-1 lg:grid-cols-2 gap-5';

  return (
    <section className={gridClass}>
      <DistrictParticipationChart
        districts={data.districts}
        activeCampNom={data.activeCamp?.nom}
      />
      <AdhesionStatusChart adhesions={data.adhesions} />
      <TopChallengesChart challenges={data.challenges} />
      <CampParticipantsChart camps={data.camps} />
    </section>
  );
}
