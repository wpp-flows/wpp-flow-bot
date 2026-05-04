interface Point {
  date: string;
  count: number;
}

interface Props {
  data: Point[];
}

/**
 * Lightweight inline SVG line chart — no external dep, theme-aware via CSS vars.
 */
export function ConversationsChart({ data }: Props) {
  if (data.length === 0) return null;

  const width = 720;
  const height = 220;
  const padX = 12;
  const padY = 16;

  const max = Math.max(...data.map((p) => p.count));
  const min = Math.min(...data.map((p) => p.count));
  const range = Math.max(1, max - min);

  const x = (i: number) => padX + (i * (width - padX * 2)) / (data.length - 1);
  const y = (v: number) => padY + ((max - v) / range) * (height - padY * 2);

  const linePath = data.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.count)}`).join(' ');
  const areaPath = `${linePath} L ${x(data.length - 1)} ${height - padY} L ${x(0)} ${height - padY} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-full w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.18" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* gridlines */}
      {[0.25, 0.5, 0.75].map((p) => (
        <line
          key={p}
          x1={padX}
          x2={width - padX}
          y1={padY + p * (height - padY * 2)}
          y2={padY + p * (height - padY * 2)}
          stroke="hsl(var(--border))"
          strokeDasharray="2 4"
        />
      ))}
      <path d={areaPath} fill="url(#chart-fill)" />
      <path d={linePath} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
      {data.map((p, i) => (
        <circle
          key={p.date}
          cx={x(i)}
          cy={y(p.count)}
          r={i === data.length - 1 ? 4 : 2.5}
          fill={i === data.length - 1 ? 'hsl(var(--primary))' : 'hsl(var(--background))'}
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}
