'use client';

import { useState } from 'react';

type PeekType = 'tight' | 'wide';
type EnemyDist = 'close' | 'medium' | 'far';

const PEEK = {
  tight: {
    label: 'TIGHT PEEK',
    angle: 8,
    color: '#00ff88',
    exposureTime: '50-100ms',
    shotOpportunity: 'Low',
    idealRange: '< 10m',
    description: 'You stay tight to cover, so the enemy sees only a tiny part of your body. Minimal exposure. Use it to gather information or jiggle without fully committing.',
  },
  wide: {
    label: 'WIDE PEEK',
    angle: 42,
    color: '#ff6644',
    exposureTime: '150-250ms',
    shotOpportunity: 'High',
    idealRange: '15-40m',
    description: 'You move away from cover to open the angle, so the enemy sees more of your body. Maximum exposure. Use it when the target is confirmed and you want to commit.',
  },
} as const;

const ENEMY_POSITIONS: Record<EnemyDist, { x: number; label: string }> = {
  close: { x: 270, label: '< 10m' },
  medium: { x: 330, label: '~25m' },
  far: { x: 385, label: '> 50m' },
};

export default function PeekAngleVisualizer() {
  const [peekType, setPeekType] = useState<PeekType>('tight');
  const [dist, setDist] = useState<EnemyDist>('medium');

  const peek = PEEK[peekType];
  const enemy = ENEMY_POSITIONS[dist];
  const corner = { x: 200, y: 130 };
  const rad = (peek.angle * Math.PI) / 180;
  const arcR = 75;
  const ax1 = corner.x + arcR * Math.cos(-rad / 2);
  const ay1 = corner.y + arcR * Math.sin(-rad / 2);
  const ax2 = corner.x + arcR * Math.cos(rad / 2);
  const ay2 = corner.y + arcR * Math.sin(rad / 2);
  const playerX = peekType === 'tight' ? 155 : 185;
  const playerY = 160;
  const enemyY = 80;

  return (
    <div style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: '4px', marginBottom: '2rem', overflow: 'hidden', fontFamily: 'monospace' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)' }}>
        <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', opacity: 0.4, marginBottom: '0.3rem' }}>INTERACTIVE VISUALIZER</div>
        <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.08em' }}>PEEK ANGLE VISUALIZER</div>
      </div>

      <div style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.5rem', letterSpacing: '0.12em', opacity: 0.4, marginBottom: '0.5rem' }}>PEEK TYPE</div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {(['tight', 'wide'] as PeekType[]).map((type) => (
                <button key={type} onClick={() => setPeekType(type)} style={{ padding: '5px 14px', border: `1px solid ${peekType === type ? PEEK[type].color : 'rgba(0,0,0,0.15)'}`, background: peekType === type ? `${PEEK[type].color}12` : 'transparent', color: peekType === type ? PEEK[type].color : 'rgba(0,0,0,0.45)', fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.1em', cursor: 'pointer', borderRadius: '2px' }}>
                  {type.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.5rem', letterSpacing: '0.12em', opacity: 0.4, marginBottom: '0.5rem' }}>ENEMY DISTANCE</div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {(['close', 'medium', 'far'] as EnemyDist[]).map((distance) => (
                <button key={distance} onClick={() => setDist(distance)} style={{ padding: '5px 14px', border: `1px solid ${dist === distance ? '#00ff88' : 'rgba(0,0,0,0.15)'}`, background: dist === distance ? 'rgba(0,255,136,0.08)' : 'transparent', color: dist === distance ? '#00ff88' : 'rgba(0,0,0,0.45)', fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.1em', cursor: 'pointer', borderRadius: '2px' }}>
                  {distance.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: '#0c0c0c', borderRadius: '3px', marginBottom: '1.5rem', overflow: 'hidden' }}>
          <svg width="100%" viewBox="0 0 500 240" style={{ display: 'block' }}>
            {Array.from({ length: 26 }).map((_, i) => (
              <line key={`v${i}`} x1={i * 20} y1={0} x2={i * 20} y2={240} stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
            ))}
            {Array.from({ length: 13 }).map((_, i) => (
              <line key={`h${i}`} x1={0} y1={i * 20} x2={500} y2={i * 20} stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
            ))}
            <text x="90" y="20" fontSize="8" fill="rgba(0,255,136,0.4)" fontFamily="monospace" letterSpacing="2">SAFE SIDE</text>
            <text x="260" y="20" fontSize="8" fill="rgba(255,80,80,0.4)" fontFamily="monospace" letterSpacing="2">DANGER ZONE</text>
            <rect x={197} y={10} width={6} height={130} fill="rgba(255,255,255,0.3)" />
            <text x={200} y={8} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.35)" fontFamily="monospace" letterSpacing="1">COVER</text>
            <path
              d={`M ${corner.x} ${corner.y} L ${ax1} ${ay1} A ${arcR} ${arcR} 0 0 1 ${ax2} ${ay2} Z`}
              fill={`${peek.color}14`}
              stroke={peek.color}
              strokeWidth="0.8"
              strokeDasharray="3 2"
            />
            <line x1={playerX} y1={playerY} x2={enemy.x} y2={enemyY} stroke={peek.color} strokeWidth="0.8" strokeDasharray="5 3" opacity="0.45" />
            <circle cx={playerX} cy={playerY} r="7" fill="rgba(0,255,136,0.15)" stroke="#00ff88" strokeWidth="1.5" />
            <text x={playerX - 22} y={playerY + 18} fontSize="7" fill="rgba(0,255,136,0.6)" fontFamily="monospace">YOU</text>
            <circle cx={enemy.x} cy={enemyY} r="7" fill="rgba(255,60,60,0.15)" stroke="#ff4444" strokeWidth="1.5" />
            <text x={enemy.x - 18} y={enemyY - 12} fontSize="7" fill="rgba(255,80,80,0.6)" fontFamily="monospace">ENEMY</text>
            <text x={enemy.x - 10} y={enemyY + 18} fontSize="7" fill="rgba(255,80,80,0.4)" fontFamily="monospace">{enemy.label}</text>
            <text x={corner.x + 80} y={corner.y - 8} fontSize="9" fill={`${peek.color}80`} fontFamily="monospace">{peek.angle} deg exposed</text>
            <circle cx={corner.x} cy={corner.y} r="2.5" fill={peek.color} opacity="0.6" />
          </svg>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.6rem', marginBottom: '1.25rem' }}>
          {[
            { label: 'EXPOSED ANGLE', value: `${peek.angle} deg` },
            { label: 'EXPOSURE TIME', value: peek.exposureTime },
            { label: 'SHOT WINDOW', value: peek.shotOpportunity },
            { label: 'IDEAL RANGE', value: peek.idealRange },
          ].map((stat) => (
            <div key={stat.label} style={{ padding: '0.7rem', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '3px', background: 'rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.44rem', letterSpacing: '0.1em', opacity: 0.35, marginBottom: '0.3rem' }}>{stat.label}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: peek.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '2px' }}>
          <span style={{ fontSize: '0.5rem', opacity: 0.4, letterSpacing: '0.12em' }}>{peek.label} - </span>
          <span style={{ fontSize: '0.57rem', opacity: 0.65, lineHeight: 1.7 }}>{peek.description}</span>
        </div>
      </div>
    </div>
  );
}
