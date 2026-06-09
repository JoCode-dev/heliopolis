interface ChartGradientProps {
  id: string;
  from: string;
  to: string;
  direction?: 'vertical' | 'horizontal';
}

export function ChartGradient({
  id,
  from,
  to,
  direction = 'vertical',
}: ChartGradientProps) {
  const isHorizontal = direction === 'horizontal';

  return (
    <defs>
      <linearGradient
        id={id}
        x1="0"
        y1="0"
        x2={isHorizontal ? '1' : '0'}
        y2={isHorizontal ? '0' : '1'}
      >
        <stop offset="0%" stopColor={from} stopOpacity={1} />
        <stop offset="100%" stopColor={to} stopOpacity={0.72} />
      </linearGradient>
    </defs>
  );
}
