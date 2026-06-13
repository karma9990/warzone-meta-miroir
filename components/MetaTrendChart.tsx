'use client';

import { useMemo, useState } from 'react';
import type { MetaSnapshot } from '@/lib/metaHistoryStore';
import type { Locale } from '@/lib/i18n';

type Props = {
  history: MetaSnapshot[];
  locale: Locale;
};

const COPY = {
  en: { weapon: 'Weapon', score: 'Meta score', collecting: 'Trend data is being collected daily. Check back as history builds up.', points: 'data points', current: 'Current' },
  fr: { weapon: 'Arme', score: 'Score meta', collecting: 'Les donnees de tendance sont collectees chaque jour. Reviens au fur et a mesure.', points: 'points de donnees', current: 'Actuel' },
  es: { weapon: 'Arma', score: 'Score meta', collecting: 'Los datos de tendencia se recopilan a diario. Vuelve a medida que crezca el historial.', points: 'puntos de datos', current: 'Actual' },
};

const TIER_COLOR: Record<string, string> = { S: '#163cff', A: '#1f8f4d', B: '#b8860b', C: '#8a8a82' };

const W = 720;
const H = 280;
const PAD = { top: 24, right: 24, bottom: 40, left: 40 };

export default function MetaTrendChart({ history, locale }: Props) {
  const lang = locale === 'fr' ? 'fr' : locale === 'es' ? 'es' : 'en';
  const t = COPY[lang];

  const latest = history[history.length - 1];
  const weaponOptions = useMemo(() => {
    return Object.entries(latest?.weapons ?? {})
      .map(([id, snapshot]) => ({ id, weapon: snapshot.weapon, score: snapshot.score }))
      .sort((a, b) => b.score - a.score);
  }, [latest]);

  const [selected, setSelected] = useState(weaponOptions[0]?.id ?? '');

  const series = useMemo(() => {
    return history
      .map((snapshot) => ({ date: snapshot.date, point: snapshot.weapons[selected] }))
      .filter((entry): entry is { date: string; point: NonNullable<typeof entry.point> } => Boolean(entry.point));
  }, [history, selected]);

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const minY = 0;
  const maxY = 100;

  const xFor = (index: number) => PAD.left + (series.length <= 1 ? innerW / 2 : (index / (series.length - 1)) * innerW);
  const yFor = (value: number) => PAD.top + innerH - ((value - minY) / (maxY - minY)) * innerH;

  const linePath = series.map((entry, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index)} ${yFor(entry.point.score)}`).join(' ');
  const current = series[series.length - 1]?.point;

  return (
    <div className="trend">
      <div className="trend-controls">
        <label>
          <span>{t.weapon}</span>
          <select value={selected} onChange={(event) => setSelected(event.currentTarget.value)}>
            {weaponOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.weapon}</option>
            ))}
          </select>
        </label>
        {current && (
          <div className="trend-current">
            <span className="trend-tier" style={{ background: TIER_COLOR[current.tier] ?? '#163cff' }}>{current.tier}</span>
            <strong>{current.score}</strong>
            <span className="trend-current-label">{t.current} {t.score.toLowerCase()}</span>
          </div>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="trend-svg" role="img" aria-label={`${t.score} trend`}>
        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yFor(tick)} y2={yFor(tick)} stroke="rgba(16,16,14,0.1)" strokeWidth="1" />
            <text x={PAD.left - 8} y={yFor(tick) + 4} textAnchor="end" fontSize="11" fill="rgba(16,16,14,0.45)">{tick}</text>
          </g>
        ))}
        {series.length > 1 && <path d={linePath} fill="none" stroke="#163cff" strokeWidth="2.5" />}
        {series.map((entry, index) => (
          <g key={entry.date}>
            <circle cx={xFor(index)} cy={yFor(entry.point.score)} r="4" fill={TIER_COLOR[entry.point.tier] ?? '#163cff'} />
            {(index === 0 || index === series.length - 1 || series.length <= 6) && (
              <text x={xFor(index)} y={H - PAD.bottom + 18} textAnchor="middle" fontSize="10" fill="rgba(16,16,14,0.45)">
                {entry.date.slice(5)}
              </text>
            )}
          </g>
        ))}
      </svg>

      {series.length <= 1 && <p className="trend-note">{t.collecting}</p>}
      <p className="trend-meta">{series.length} {t.points}</p>

      <style>{`
        .trend { border: 1px solid rgba(22,60,255,0.24); background: var(--theme-panel, rgba(239,238,232,0.7)); padding: 1.2rem; }
        .trend-controls { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
        .trend-controls label { display: grid; gap: 0.3rem; }
        .trend-controls span { font-size: 0.66rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(16,16,14,0.55); }
        .trend-controls select { border: 1px solid rgba(16,16,14,0.2); background: transparent; color: inherit; font: inherit; font-size: 0.9rem; padding: 0.45rem 0.6rem; }
        .trend-current { display: flex; align-items: center; gap: 0.5rem; }
        .trend-tier { display: inline-grid; place-items: center; min-width: 26px; height: 26px; color: #fff; font-weight: 900; font-size: 0.8rem; }
        .trend-current strong { font-size: 1.8rem; color: #163cff; line-height: 1; }
        .trend-current-label { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(16,16,14,0.5); }
        .trend-svg { width: 100%; height: auto; display: block; }
        .trend-note { margin: 0.8rem 0 0; font-size: 0.78rem; color: rgba(16,16,14,0.6); line-height: 1.5; }
        .trend-meta { margin: 0.5rem 0 0; font-size: 0.66rem; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(16,16,14,0.4); }
        :global(:root[data-theme="dark"]) .trend-controls span, :global(:root[data-theme="dark"]) .trend-current-label, :global(:root[data-theme="dark"]) .trend-note, :global(:root[data-theme="dark"]) .trend-meta { color: rgba(255,255,255,0.55); }
        :global(:root[data-theme="dark"]) .trend-controls select { border-color: rgba(255,255,255,0.22); }
        :global(:root[data-theme="dark"]) .trend-svg line { stroke: rgba(255,255,255,0.12); }
        :global(:root[data-theme="dark"]) .trend-svg text { fill: rgba(255,255,255,0.45); }
      `}</style>
    </div>
  );
}
