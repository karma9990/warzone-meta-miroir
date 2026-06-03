'use client';

import { useState } from 'react';

type Tab = 'weapon' | 'terrain';

const WEAPON_ROWS = [
  { label: 'Pistol / No primary', sprint: 100, tacSprint: 100, adsWalk: 92 },
  { label: 'SMG', sprint: 97, tacSprint: 96, adsWalk: 82 },
  { label: 'AR', sprint: 95, tacSprint: 93, adsWalk: 76 },
  { label: 'Shotgun', sprint: 93, tacSprint: 91, adsWalk: 70 },
  { label: 'LMG', sprint: 89, tacSprint: 87, adsWalk: 62 },
  { label: 'Sniper / Marksman', sprint: 87, tacSprint: 85, adsWalk: 55 },
  { label: 'Launcher', sprint: 83, tacSprint: 80, adsWalk: 48 },
];

const TERRAIN_ROWS = [
  { label: 'Flat ground', sprint: 100, note: 'Baseline. Slide cancel available.', risk: 'none' },
  { label: 'Downhill slope', sprint: 112, note: 'Speed bonus. Useful for escaping pressure.', risk: 'none' },
  { label: 'Uphill slope', sprint: 62, note: 'Major penalty. Break sideways toward cover or a building.', risk: 'high' },
  { label: 'Shallow water', sprint: 55, note: 'No slide cancel. Predictable path. Avoid during fights.', risk: 'high' },
  { label: 'Deep water', sprint: 32, note: 'Almost immobile. Never cross under fire.', risk: 'critical' },
  { label: 'Vault obstacle', sprint: 0, note: '600-800ms exposure window. Pre-check the landing area.', risk: 'critical' },
  { label: 'Mantle climb', sprint: 0, note: '400-600ms exposure window. Do not climb under fire.', risk: 'critical' },
];

function SpeedBar({ value, color }: { value: number; color: string }) {
  if (value === 0) return <span className="text-sm font-bold opacity-70" style={{ color: '#ff4444' }}>--</span>;
  return (
    <div className="flex items-center gap-2">
      <div className="h-[3px] rounded-sm min-w-[8px]" style={{ width: `${Math.min(value, 112) * 0.55}px`, background: color }} />
      <span className="text-xs font-bold" style={{ color }}>{value}%</span>
    </div>
  );
}

function speedColor(v: number) {
  if (v === 0) return '#ff4444';
  if (v >= 95) return '#00aa60';
  if (v >= 75) return '#88aa44';
  if (v >= 55) return '#cc9900';
  if (v >= 35) return '#ff9944';
  return '#ff4444';
}

const RISK_STYLE: Record<string, { bg: string; border: string }> = {
  none: { bg: 'transparent', border: 'rgba(0,0,0,0.07)' },
  high: { bg: 'rgba(255,180,0,0.04)', border: 'rgba(255,180,0,0.2)' },
  critical: { bg: 'rgba(255,60,60,0.04)', border: 'rgba(255,60,60,0.2)' },
};

export default function MovementSpeedReference() {
  const [tab, setTab] = useState<Tab>('weapon');

  return (
    <div className="border border-black/12 rounded mb-8 overflow-hidden font-mono">
      <div className="px-6 py-5 border-b border-black/10 bg-black/2">
        <div className="text-xs tracking-normal opacity-40 mb-1">REFERENCE TABLE</div>
        <div className="text-base font-bold tracking-normal">MOVEMENT SPEED REFERENCE</div>
      </div>

      <div className="flex border-b border-black/10">
        {([['weapon', 'BY WEAPON CLASS'], ['terrain', 'BY TERRAIN']] as [Tab, string][]).map(([id, label]) => (
          <button type="button" key={id} onClick={() => setTab(id)}
            className="font-mono text-xs tracking-normal cursor-pointer bg-transparent border-none"
            style={{
              padding: '0.75rem 1.5rem',
              borderBottom: tab === id ? '2px solid currentColor' : '2px solid transparent',
              color: tab === id ? 'inherit' : 'rgba(0,0,0,0.35)',
              fontWeight: tab === id ? 700 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-6 py-5">
        {tab === 'weapon' && (
          <>
            <div className="text-xs tracking-normal opacity-35 mb-4">
              BASE = 100% (pistol / no primary). Values are approximate and vary by attachment setup.
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    {['CLASS', 'SPRINT', 'TACTICAL SPRINT', 'ADS WALK'].map((h) => (
                      <th key={h} className="text-xs tracking-normal font-normal text-left px-3 py-[0.55rem] border-b border-black/10 opacity-[0.38]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {WEAPON_ROWS.map((row) => (
                    <tr key={row.label} className="border-b border-black/5">
                      <td className="px-3 py-[0.65rem] tracking-normal opacity-80">{row.label}</td>
                      <td className="px-3 py-[0.65rem]"><SpeedBar value={row.sprint} color={speedColor(row.sprint)} /></td>
                      <td className="px-3 py-[0.65rem]"><SpeedBar value={row.tacSprint} color={speedColor(row.tacSprint)} /></td>
                      <td className="px-3 py-[0.65rem]"><SpeedBar value={row.adsWalk} color={speedColor(row.adsWalk)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 px-[0.85rem] py-[0.65rem] bg-black/3 border border-black/6 rounded-sm text-xs opacity-55 leading-relaxed">
              When rotating under fire, holding a pistol or stowing your primary gives the highest movement speed. In late circles, every percent matters.
            </div>
          </>
        )}

        {tab === 'terrain' && (
          <>
            <div className="text-xs tracking-normal opacity-35 mb-4">
              Relative sprint speed compared to flat ground. Terrain penalties apply across all weapon classes.
            </div>
            <div className="flex flex-col gap-[0.45rem]">
              {TERRAIN_ROWS.map((row) => {
                const rs = RISK_STYLE[row.risk];
                return (
                  <div key={row.label} className="grid grid-cols-[1fr_90px] gap-4 items-center rounded-sm"
                    style={{ padding: '0.8rem 1rem', border: `1px solid ${rs.border}`, background: rs.bg }}
                  >
                    <div>
                      <div className="text-xs tracking-normal mb-[0.2rem]">{row.label}</div>
                      <div className="text-xs opacity-45 leading-relaxed">{row.note}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs opacity-35 tracking-normal mb-[0.2rem]">SPRINT</div>
                      <SpeedBar value={row.sprint} color={speedColor(row.sprint)} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
