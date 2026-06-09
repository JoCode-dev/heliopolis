import type { ChartConfig } from '@/components/ui/chart';

export const BRAND_CHART_COLORS = {
  rouge: '#C62828',
  vert: '#2E7D32',
  or: '#D9A441',
  violet: '#6A1B9A',
  nuit: '#1F1B2E',
} as const;

export const CHART_HEIGHT = 'h-[240px] w-full lg:h-[300px]';

export const CHART_AXIS_TICK = {
  fontSize: 11,
  fill: '#6b6b78',
};

export const districtChartConfig = {
  routiers: { label: 'Routiers', color: BRAND_CHART_COLORS.rouge },
  selectionnes: { label: 'Sélectionnés', color: BRAND_CHART_COLORS.vert },
} satisfies ChartConfig;

export const adhesionChartConfig = {
  aJour: { label: 'À jour', color: BRAND_CHART_COLORS.vert },
  nonAJour: { label: 'Non à jour', color: BRAND_CHART_COLORS.rouge },
  enAttente: { label: 'En attente', color: BRAND_CHART_COLORS.or },
} satisfies ChartConfig;

export const challengesChartConfig = {
  submissions: { label: 'Soumissions', color: BRAND_CHART_COLORS.violet },
} satisfies ChartConfig;

export const campsChartConfig = {
  participants: { label: 'Participants', color: BRAND_CHART_COLORS.or },
} satisfies ChartConfig;

export const CHART_ANIMATION = {
  isAnimationActive: true,
  animationDuration: 800,
  animationEasing: 'ease-out' as const,
};

export const CHART_BAR_PROPS = {
  maxBarSize: 36,
  activeBar: { opacity: 0.85 },
  cursor: 'pointer' as const,
};
