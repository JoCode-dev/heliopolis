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
    ? 'grid grid-cols-1 gap-3'
    : 'grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-5';

  return (
    <div className={gridClass}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-[#ececf0] rounded-2xl p-3 lg:p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 animate-pulse rounded-xl bg-[#f0f0f4]" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-32 animate-pulse rounded bg-[#f0f0f4]" />
              <div className="h-2.5 w-20 animate-pulse rounded bg-[#f0f0f4]" />
            </div>
          </div>
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
    ? 'grid grid-cols-1 gap-3'
    : 'grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-5';

  return (
    <section className={gridClass}>
      <DistrictParticipationChart
        districts={data.districts}
        activeCampNom={data.activeCamp?.nom}
        compact={compact}
      />
      <AdhesionStatusChart adhesions={data.adhesions} />
      <TopChallengesChart challenges={data.challenges} />
      <CampParticipantsChart camps={data.camps} />
    </section>
  );
}
