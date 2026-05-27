'use client';

import { useState } from 'react';

const FOV_MIN = 60;
const FOV_MAX = 120;

function apparentSize(fov: number): number {
  return Math.tan((80 * Math.PI) / 360) / Math.tan((fov * Math.PI) / 360);
}

function sensitivityFactor(from: number, to: number): number {
  return Math.tan((to * Math.PI) / 360) / Math.tan((from * Math.PI) / 360);
}

function getRecommendation(playstyle: string, platform: string): { fov: number; reason: string } {
  if (platform === 'console-old') return { fov: 80, reason: 'Old-gen console is locked to 80 FOV - no adjustment is available.' };
  if (playstyle === 'sniper') {
    return { fov: platform === 'pc' ? 90 : 85, reason: 'A tighter FOV makes long-range targets appear larger and easier to track.' };
  }
  if (playstyle === 'aggressive') {
    return { fov: platform === 'pc' ? 105 : 95, reason: 'A wider FOV improves close-range awareness and helps you catch flanks earlier.' };
  }
  return { fov: platform === 'pc' ? 100 : 90, reason: 'The best compromise between target size and map awareness for a balanced playstyle.' };
}

function FOVPreview({ fov, label }: { fov: number; label: string }) {
  const size = apparentSize(fov);
  const targetH = Math.round(60 * size);
  const targetW = Math.round(22 * size);
  const svgW = 180;
  const svgH = 120;
  const cx = svgW / 2;
  const cy = svgH / 2 + 10;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <svg width={svgW} height={svgH} style={{ background: 'rgba(0,0,0,0.88)', border: '1px solid rgba(255,255,255,0.06)', display: 'block' }}>
        {(() => {
          const halfAngle = (fov / 2) * (Math.PI / 180);
          const depth = svgH * 0.9;
          const spread = depth * Math.tan(halfAngle) * 0.35;
          return (
            <>
              <line x1={cx} y1={0} x2={cx - spread} y2={depth} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
              <line x1={cx} y1={0} x2={cx + spread} y2={depth} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
            </>
          );
        })()}
        <rect
          x={cx - targetW / 2}
          y={cy - targetH / 2}
          width={targetW}
          height={targetH}
          fill="rgba(255,80,80,0.18)"
          stroke="rgba(255,80,80,0.6)"
          strokeWidth={1}
        />
        <circle
          cx={cx}
          cy={cy - targetH / 2 - (targetW * 0.45)}
          r={targetW * 0.45}
          fill="rgba(255,80,80,0.18)"
          stroke="rgba(255,80,80,0.6)"
          strokeWidth={1}
        />
        <line x1={cx - 6} y1={cy - targetH / 2 - (targetW * 0.45)} x2={cx + 6} y2={cy - targetH / 2 - (targetW * 0.45)} stroke="rgba(255,255,255,0.5)" strokeWidth={1} />
        <line x1={cx} y1={cy - targetH / 2 - (targetW * 0.45) - 6} x2={cx} y2={cy - targetH / 2 - (targetW * 0.45) + 6} stroke="rgba(255,255,255,0.5)" strokeWidth={1} />
        <text x={svgW / 2} y={svgH - 6} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={8} fontFamily="monospace">{fov} FOV</text>
      </svg>
      <span style={{ fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.15em', opacity: 0.4 }}>{label}</span>
    </div>
  );
}

export default function FovOptimizer() {
  const [fov, setFov] = useState(80);
  const [playstyle, setPlaystyle] = useState<string | null>(null);
  const [platform, setPlatform] = useState<string | null>(null);

  const rec = playstyle && platform ? getRecommendation(playstyle, platform) : null;
  const sensAdj = rec ? sensitivityFactor(fov, rec.fov) : null;
  const sensDir = sensAdj !== null ? (sensAdj > 1.02 ? 'increase' : sensAdj < 0.98 ? 'decrease' : null) : null;
  const sensPct = sensAdj !== null ? Math.abs(Math.round((sensAdj - 1) * 100)) : 0;

  return (
    <div style={{ border: '1px solid rgba(0,0,0,0.15)', background: 'rgba(0,0,0,0.02)', marginBottom: '3rem' }}>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.2em', opacity: 0.4 }}>EXCLUSIVE TOOL</span>
        <h2 style={{ fontFamily: 'monospace', fontSize: '0.95rem', letterSpacing: '0.1em', margin: '0.25rem 0 0' }}>FOV OPTIMIZER</h2>
      </div>

      <div style={{ padding: '1.5rem' }}>
        <p style={{ fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.18em', opacity: 0.35, margin: '0 0 0.4rem' }}>CURRENT FOV</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <input
            type="range" min={FOV_MIN} max={FOV_MAX} step={1} value={fov}
            onChange={(e) => setFov(Number(e.target.value))}
            style={{ flex: 1, accentColor: 'blue' }}
          />
          <span style={{ fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: 700, color: 'blue', minWidth: '3rem', textAlign: 'right' }}>{fov}</span>
        </div>

        <p style={{ fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.18em', opacity: 0.35, margin: '0 0 0.5rem' }}>PLATFORM</p>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {[
            { id: 'pc', label: 'PC' },
            { id: 'console', label: 'Next-gen console' },
            { id: 'console-old', label: 'Old-gen console' },
          ].map((p) => (
            <button key={p.id} onClick={() => setPlatform(p.id)} style={{
              fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.06em',
              padding: '0.55rem 1rem',
              border: `1px solid ${platform === p.id ? 'blue' : 'rgba(0,0,0,0.12)'}`,
              background: platform === p.id ? 'rgba(0,0,255,0.06)' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>{p.label}</button>
          ))}
        </div>

        <p style={{ fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.18em', opacity: 0.35, margin: '0 0 0.5rem' }}>PLAYSTYLE</p>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
          {[
            { id: 'aggressive', label: 'Aggressive' },
            { id: 'balanced', label: 'Balanced' },
            { id: 'sniper', label: 'Sniper / Long range' },
          ].map((p) => (
            <button key={p.id} onClick={() => setPlaystyle(p.id)} style={{
              fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.06em',
              padding: '0.55rem 1rem',
              border: `1px solid ${playstyle === p.id ? 'blue' : 'rgba(0,0,0,0.12)'}`,
              background: playstyle === p.id ? 'rgba(0,0,255,0.06)' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>{p.label}</button>
          ))}
        </div>

        {rec && (
          <>
            <p style={{ fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.18em', opacity: 0.35, margin: '0 0 1rem' }}>COMPARISON - APPARENT TARGET SIZE</p>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'flex-start' }}>
              <FOVPreview fov={fov} label="CURRENT" />
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignSelf: 'center', paddingBottom: '1.5rem' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '1.2rem', opacity: 0.2 }}>{'->'}</span>
              </div>
              <FOVPreview fov={rec.fov} label="RECOMMENDED" />

              <div style={{ flex: 1, minWidth: '160px' }}>
                <div style={{ border: '1px solid rgba(0,0,255,0.2)', background: 'rgba(0,0,255,0.03)', padding: '1.1rem 1.25rem', marginBottom: '0.75rem' }}>
                  <p style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.18em', opacity: 0.35, margin: '0 0 0.4rem' }}>RECOMMENDED FOV</p>
                  <p style={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: 700, color: 'blue', margin: '0 0 0.5rem', letterSpacing: '0.05em' }}>{rec.fov}</p>
                  <p style={{ fontFamily: 'monospace', fontSize: '0.65rem', opacity: 0.5, margin: 0, lineHeight: 1.7 }}>{rec.reason}</p>
                </div>
                {sensDir && (
                  <p style={{ fontFamily: 'monospace', fontSize: '0.62rem', lineHeight: 1.8, opacity: 0.42, margin: 0 }}>
                    Sensitivity note: expect to {sensDir} your aim sensitivity by roughly {sensPct}% after changing FOV.
                  </p>
                )}
              </div>
            </div>

            <p style={{ fontFamily: 'monospace', fontSize: '0.62rem', lineHeight: 1.8, opacity: 0.38, margin: '0 0 0.6rem' }}>
              Higher FOV reduces apparent target size but increases peripheral awareness. There is no universal value - every FOV change requires 5 to 10 sessions of aim recalibration.
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: '0.62rem', lineHeight: 1.8, opacity: 0.38, margin: 0 }}>
              On controller, FOV can subtly affect aim-assist feel because target scale and tracking speed change together. Treat the recommendation as a starting point, not a rule.
            </p>
          </>
        )}

        {!rec && (
          <p style={{ fontFamily: 'monospace', fontSize: '0.68rem', opacity: 0.35, margin: 0 }}>
            Select your platform and playstyle to get a recommendation.
          </p>
        )}
      </div>
    </div>
  );
}
