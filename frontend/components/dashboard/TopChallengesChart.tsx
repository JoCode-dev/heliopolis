'use client';

import { PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BRAND_CHART_COLORS,
  CHALLENGE_RADIAL_COLORS,
  CHART_ANIMATION,
  CHART_SIZE,
  challengesChartConfig,
} from '@/lib/chart-colors';
import type { DashboardStats } from '@/types/dashboard-stats';
import { ChartCard, ChartEmpty, ChartStatChip } from './ChartCard';

interface TopChallengesChartProps {
  challenges: DashboardStats['challenges'];
}

export function TopChallengesChart({ challenges }: TopChallengesChartProps) {
  if (challenges.length === 0) {
    return (
      <ChartCard
        title="Défis les plus soumis"
        icon="🏆"
        accentColor={BRAND_CHART_COLORS.violet}
      >
        <ChartEmpty message="Aucun défi soumis" icon="🏆" />
      </ChartCard>
    );
  }

  const totalSubmissions = challenges.reduce((s, c) => s + c.submissions, 0);
  const topSubmissions = challenges[0]?.submissions ?? 0;
  const maxSubmissions = Math.max(...challenges.map((c) => c.submissions), 1);

  const data = challenges.map((c, i) => ({
    key: c.id,
    titre: c.titre,
    submissions: c.submissions,
    fill: CHALLENGE_RADIAL_COLORS[i % CHALLENGE_RADIAL_COLORS.length],
  }));

  const chartConfig = Object.fromEntries(
    data.map((d) => [d.key, { label: d.titre, color: d.fill }]),
  );

  return (
    <ChartCard
      title="Défis les plus soumis"
      icon="🏆"
      accentColor={BRAND_CHART_COLORS.violet}
      description="Top 5 par nombre de soumissions"
      footer={
        <>
          <ChartStatChip label="Total" value={totalSubmissions} />
          <ChartStatChip
            label="Leader"
            value={topSubmissions}
            color={BRAND_CHART_COLORS.violet}
          />
        </>
      }
    >
      <div className="relative">
        <ChartContainer
          config={{ ...challengesChartConfig, ...chartConfig }}
          className={`${CHART_SIZE} mx-auto aspect-square max-w-[240px] sm:max-w-[260px]`}
        >
          <RadialBarChart
            data={data}
            innerRadius="28%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            barSize={12}
            cx="50%"
            cy="50%"
          >
            <PolarAngleAxis
              type="number"
              domain={[0, maxSubmissions]}
              tick={false}
              axisLine={false}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  nameKey="key"
                  labelFormatter={(_, payload) =>
                    (payload?.[0]?.payload as { titre?: string })?.titre ?? ''
                  }
                />
              }
            />
            <RadialBar
              dataKey="submissions"
              background={{ fill: '#f0f0f4' }}
              cornerRadius={6}
              {...CHART_ANIMATION}
            />
          </RadialBarChart>
        </ChartContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-black text-[#1F1B2E] tabular-nums leading-none">
              {totalSubmissions}
            </p>
            <p className="text-[10px] text-[#6b6b78] mt-0.5 font-medium">
              soumissions
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2 mt-3">
        {data.map((d, i) => {
          const pct =
            totalSubmissions > 0
              ? Math.round((d.submissions / totalSubmissions) * 100)
              : 0;
          return (
            <div key={d.key} className="flex items-center gap-2.5">
              <span
                className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black flex-shrink-0 text-white"
                style={{ backgroundColor: d.fill }}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-[#1F1B2E] leading-snug line-clamp-2">
                  {d.titre}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 tabular-nums">
                <span className="text-sm font-black text-[#1F1B2E]">{d.submissions}</span>
                <span className="text-[10px] text-[#6b6b78] w-7 text-right">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}
