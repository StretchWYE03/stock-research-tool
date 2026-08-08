interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  area?: boolean;
}

export default function Sparkline({ data, width = 96, height = 28, color = "#64748B", area = true }: SparklineProps) {
  if (data.length < 2) {
    return <svg width={width} height={height} className="sparkline" />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });

  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `M${pts[0][0].toFixed(1)},${height} L${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L")} L${pts[pts.length - 1][0].toFixed(1)},${height} Z`;

  return (
    <svg width={width} height={height} className="sparkline" aria-hidden="true">
      {area && <path d={areaPath} fill={color} opacity={0.12} />}
      <polyline points={line} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
