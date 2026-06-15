import type { ChartConfig } from '@/components/ui/chart';

export const BRAND_CHART_COLORS = {
  rouge: '#C62828',
  vert: '#2E7D32',
  or: '#D9A441',
  violet: '#6A1B9A',
  nuit: '#1F1B2E',
} as const;

export const CHART_SIZE = 'h-[200px] w-full sm:h-[220px]';

export const CHALLENGE_RADIAL_COLORS = [
  '#6A1B9A',
  '#8e4ec0',
  '#b388d9',
  '#c9a8e8',
  '#dcc4f0',
] as const;

export const CAMP_PIE_COLORS = [
  '#D9A441',
  '#C62828',
  '#2E7D32',
  '#6A1B9A',
  '#1F1B2E',
  '#F58A4B',
  '#5c6bc0',
  '#00897b',
] as const;

export const challengesChartConfig = {
  submissions: { label: 'Soumissions', color: BRAND_CHART_COLORS.violet },
} satisfies ChartConfig;

export const CHART_ANIMATION = {
  isAnimationActive: true,
  animationDuration: 700,
  animationEasing: 'ease-out' as const,
};
