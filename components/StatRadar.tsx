'use client';

import type { Tier } from '@/lib/data';

interface RadarAxis {
  label: string;
  value: number; // 0-100
}

interface StatRadarProps {
  axes: RadarAxis[];
  tier?: Tier;
  size?: number;
}

const TIER_ACCENT: Record<Tier, string> = {
  S: '#f5c542',
  A: '#163cff',
  B: '#2ec5b6',
  C: '#9a9a90',
};

const clamp = (v: number) => Math.max(0, Math.min(v, 100)) / 100;

export default function StatRadar({ axes, tier = 'A', size = 188 }: StatRadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;
  const count = axes.length;
  const accent = TIER_ACCENT[tier] ?? TIER_ACCENT.A;

  const point = (index: number, radius: number) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius] as const;
  };

  const rings = [0.34, 0.67, 1].map((scale) =>
    axes
      .map((_, i) => point(i, r * scale).join(','))
      .join(' '),
  );

  const dataPoints = axes.map((axis, i) => point(i, r * clamp(axis.value)));
  const dataPolygon = dataPoints.map((p) => p.join(',')).join(' ');

  return (
    <svg
      className="stat-radar"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Profil de performance"
      style={{ ['--radar-accent' as string]: accent }}
    >
      {/* anneaux de fond */}
      {rings.map((ring, i) => (
        <polygon key={`ring-${i}`} className="stat-radar-ring" points={ring} />
      ))}
      {/* axes */}
      {axes.map((_, i) => {
        const [x, y] = point(i, r);
        return <line key={`axis-${i}`} className="stat-radar-axis" x1={cx} y1={cy} x2={x} y2={y} />;
      })}
      {/* surface de données */}
      <polygon className="stat-radar-area" points={dataPolygon} />
      {dataPoints.map(([x, y], i) => (
        <circle key={`dot-${i}`} className="stat-radar-dot" cx={x} cy={y} r={2.4} />
      ))}
      {/* libellés */}
      {axes.map((axis, i) => {
        const [x, y] = point(i, r + size * 0.085);
        return (
          <text
            key={`label-${i}`}
            className="stat-radar-label"
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {axis.label}
          </text>
        );
      })}
    </svg>
  );
}
