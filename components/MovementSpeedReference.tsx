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
  if (value === 0) return <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ff4444', opacity: 0.7 }}>--</span>;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: `${Math.min(value, 112) * 0.55}px`, height: '3px', background: color, borderRadius: '2px', minWidth: '8px' }} />
      <span style={{ fontSize: '0.72rem', fontWeight: 700, color }}>{value}%</span>
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
    <div style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: '4px', marginBottom: '2rem', overflow: 'hidden', fontFamily: 'monospace' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)' }}>
        <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', opacity: 0.4, marginBottom: '0.3rem' }}>REFERENCE TABLE</div>
        <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.08em' }}>MOVEMENT SPEED REFERENCE</div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
        {([['weapon', 'BY WEAPON CLASS'], ['terrain', 'BY TERRAIN']] as [Tab, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding: '0.75rem 1.5rem', border: 'none', borderBottom: tab === id ? '2px solid currentColor' : '2px solid transparent', background: 'transparent', color: tab === id ? 'inherit' : 'rgba(0,0,0,0.35)', fontSize: '0.6rem', letterSpacing: '0.15em', cursor: 'pointer', fontFamily: 'monospace', fontWeight: tab === id ? 700 : 400 }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: '1.25rem 1.5rem' }}>
        {tab === 'weapon' && (
          <>
            <div style={{ fontSize: '0.48rem', letterSpacing: '0.1em', opacity: 0.35, marginBottom: '1rem' }}>
              BASE = 100% (pistol / no primary). Values are approximate and vary by attachment setup.
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.62rem' }}>
                <thead>
                  <tr>
                    {['CLASS', 'SPRINT', 'TACTICAL SPRINT', 'ADS WALK'].map((h) => (
                      <th key={h} style={{ padding: '0.55rem 0.75rem', textAlign: 'left', borderBottom: '1px solid rgba(0,0,0,0.1)', fontSize: '0.48rem', letterSpacing: '0.12em', opacity: 0.38, fontWeight: 400 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {WEAPON_ROWS.map((row) => (
                    <tr key={row.label} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                      <td style={{ padding: '0.65rem 0.75rem', letterSpacing: '0.03em', opacity: 0.8 }}>{row.label}</td>
                      <td style={{ padding: '0.65rem 0.75rem' }}><SpeedBar value={row.sprint} color={speedColor(row.sprint)} /></td>
                      <td style={{ padding: '0.65rem 0.75rem' }}><SpeedBar value={row.tacSprint} color={speedColor(row.tacSprint)} /></td>
                      <td style={{ padding: '0.65rem 0.75rem' }}><SpeedBar value={row.adsWalk} color={speedColor(row.adsWalk)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '1rem', padding: '0.65rem 0.85rem', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '2px', fontSize: '0.52rem', opacity: 0.55, lineHeight: 1.65 }}>
              When rotating under fire, holding a pistol or stowing your primary gives the highest movement speed. In late circles, every percent matters.
            </div>
          </>
        )}

        {tab === 'terrain' && (
          <>
            <div style={{ fontSize: '0.48rem', letterSpacing: '0.1em', opacity: 0.35, marginBottom: '1rem' }}>
              Relative sprint speed compared to flat ground. Terrain penalties apply across all weapon classes.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {TERRAIN_ROWS.map((row) => {
                const rs = RISK_STYLE[row.risk];
                return (
                  <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: '1rem', alignItems: 'center', padding: '0.8rem 1rem', border: `1px solid ${rs.border}`, borderRadius: '3px', background: rs.bg }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', letterSpacing: '0.04em', marginBottom: '0.2rem' }}>{row.label}</div>
                      <div style={{ fontSize: '0.5rem', opacity: 0.45, lineHeight: 1.55 }}>{row.note}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.44rem', opacity: 0.35, letterSpacing: '0.1em', marginBottom: '0.2rem' }}>SPRINT</div>
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
