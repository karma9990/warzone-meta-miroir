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
    <div className="flex flex-col items-center gap-2">
      <svg width={svgW} height={svgH} className="block" style={{ background: 'rgba(0,0,0,0.88)', border: '1px solid rgba(255,255,255,0.06)' }}>
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
        <rect x={cx - targetW / 2} y={cy - targetH / 2} width={targetW} height={targetH}
          fill="rgba(255,80,80,0.18)" stroke="rgba(255,80,80,0.6)" strokeWidth={1}
        />
        <circle cx={cx} cy={cy - targetH / 2 - (targetW * 0.45)} r={targetW * 0.45}
          fill="rgba(255,80,80,0.18)" stroke="rgba(255,80,80,0.6)" strokeWidth={1}
        />
        <line x1={cx - 6} y1={cy - targetH / 2 - (targetW * 0.45)} x2={cx + 6} y2={cy - targetH / 2 - (targetW * 0.45)} stroke="rgba(255,255,255,0.5)" strokeWidth={1} />
        <line x1={cx} y1={cy - targetH / 2 - (targetW * 0.45) - 6} x2={cx} y2={cy - targetH / 2 - (targetW * 0.45) + 6} stroke="rgba(255,255,255,0.5)" strokeWidth={1} />
        <text x={svgW / 2} y={svgH - 6} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={8} fontFamily="monospace">{fov} FOV</text>
      </svg>
      <span className="font-mono text-xs tracking-normal opacity-40">{label}</span>
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
    <div className="border border-black/15 bg-black/2 mb-12">
      <div className="px-6 py-4 border-b border-black/10">
        <span className="font-mono text-xs tracking-normal opacity-40">EXCLUSIVE TOOL</span>
        <h2 className="font-mono text-sm tracking-normal mt-1">FOV OPTIMIZER</h2>
      </div>

      <div className="p-6">
        <p className="font-mono text-xs tracking-normal opacity-35 mb-1.5">CURRENT FOV</p>
        <div className="flex items-center gap-4 mb-6">
          <input aria-label="Input" type="range" min={FOV_MIN} max={FOV_MAX} step={1} value={fov}
            onChange={(e) => setFov(Number(e.target.value))}
            className="flex-1" style={{ accentColor: 'blue' }}
          />
          <span className="font-mono text-2xl font-bold min-w-[3rem] text-right" style={{ color: 'blue' }}>{fov}</span>
        </div>

        <p className="font-mono text-xs tracking-normal opacity-35 mb-2">PLATFORM</p>
        <div className="flex gap-1 flex-wrap mb-5">
          {[
            { id: 'pc', label: 'PC' },
            { id: 'console', label: 'Next-gen console' },
            { id: 'console-old', label: 'Old-gen console' },
          ].map((p) => (
            <button type="button" key={p.id} onClick={() => setPlatform(p.id)}
              className="font-mono text-xs tracking-normal cursor-pointer transition-all duration-150"
              style={{
                padding: '0.55rem 1rem',
                border: `1px solid ${platform === p.id ? 'blue' : 'rgba(0,0,0,0.12)'}`,
                background: platform === p.id ? 'rgba(0,0,255,0.06)' : 'rgba(255,255,255,0.5)',
              }}
            >{p.label}</button>
          ))}
        </div>

        <p className="font-mono text-xs tracking-normal opacity-35 mb-2">PLAYSTYLE</p>
        <div className="flex gap-1 flex-wrap mb-7">
          {[
            { id: 'aggressive', label: 'Aggressive' },
            { id: 'balanced', label: 'Balanced' },
            { id: 'sniper', label: 'Sniper / Long range' },
          ].map((p) => (
            <button type="button" key={p.id} onClick={() => setPlaystyle(p.id)}
              className="font-mono text-xs tracking-normal cursor-pointer transition-all duration-150"
              style={{
                padding: '0.55rem 1rem',
                border: `1px solid ${playstyle === p.id ? 'blue' : 'rgba(0,0,0,0.12)'}`,
                background: playstyle === p.id ? 'rgba(0,0,255,0.06)' : 'rgba(255,255,255,0.5)',
              }}
            >{p.label}</button>
          ))}
        </div>

        {rec && (
          <>
            <p className="font-mono text-xs tracking-normal opacity-35 mb-4">COMPARISON - APPARENT TARGET SIZE</p>
            <div className="flex gap-8 flex-wrap mb-6 items-start">
              <FOVPreview fov={fov} label="CURRENT" />
              <div className="flex flex-col justify-center self-center pb-6">
                <span className="font-mono text-lg opacity-20">{'->'}</span>
              </div>
              <FOVPreview fov={rec.fov} label="RECOMMENDED" />

              <div className="flex-1 min-w-[160px]">
                <div className="mb-3 px-5 py-[1.1rem]" style={{ border: '1px solid rgba(0,0,255,0.2)', background: 'rgba(0,0,255,0.03)' }}>
                  <p className="font-mono text-xs tracking-normal opacity-35 mb-1.5">RECOMMENDED FOV</p>
                  <p className="font-mono text-3xl font-bold tracking-normal mb-2" style={{ color: 'blue' }}>{rec.fov}</p>
                  <p className="font-mono text-xs opacity-50 leading-relaxed">{rec.reason}</p>
                </div>
                {sensDir && (
                  <p className="font-mono text-xs leading-relaxed opacity-[0.42]">
                    Sensitivity note: expect to {sensDir} your aim sensitivity by roughly {sensPct}% after changing FOV.
                  </p>
                )}
              </div>
            </div>

            <p className="font-mono text-xs leading-relaxed opacity-[0.38] mb-2">
              Higher FOV reduces apparent target size but increases peripheral awareness. There is no universal value - every FOV change requires 5 to 10 sessions of aim recalibration.
            </p>
            <p className="font-mono text-xs leading-relaxed opacity-[0.38]">
              On controller, FOV can subtly affect aim-assist feel because target scale and tracking speed change together. Treat the recommendation as a starting point, not a rule.
            </p>
          </>
        )}

        {!rec && (
          <p className="font-mono text-xs opacity-35">
            Select your platform and playstyle to get a recommendation.
          </p>
        )}
      </div>
    </div>
  );
}
