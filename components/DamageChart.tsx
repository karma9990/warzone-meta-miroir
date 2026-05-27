'use client';

import { useState } from 'react';

const WEAPONS = [
  { name: 'Kogot-7',     category: 'SMG', color: '#00ccff', ranges: [{ dist: 0, dmg: 28 }, { dist: 15, dmg: 22 }, { dist: 30, dmg: 17 }, { dist: 60, dmg: 12 }] },
  { name: 'VST',         category: 'SMG', color: '#00aaee', ranges: [{ dist: 0, dmg: 32 }, { dist: 12, dmg: 25 }, { dist: 25, dmg: 19 }, { dist: 60, dmg: 13 }] },
  { name: 'Carbon 57',   category: 'SMG', color: '#0088cc', ranges: [{ dist: 0, dmg: 27 }, { dist: 18, dmg: 21 }, { dist: 35, dmg: 16 }, { dist: 60, dmg: 11 }] },
  { name: 'DS20 Mirage', category: 'AR',  color: '#00ff88', ranges: [{ dist: 0, dmg: 33 }, { dist: 30, dmg: 30 }, { dist: 60, dmg: 26 }, { dist: 100, dmg: 22 }] },
  { name: 'Voyak KT-3',  category: 'AR',  color: '#00cc66', ranges: [{ dist: 0, dmg: 35 }, { dist: 30, dmg: 32 }, { dist: 60, dmg: 28 }, { dist: 100, dmg: 24 }] },
  { name: 'M15 MOD 0',   category: 'AR',  color: '#ffcc00', ranges: [{ dist: 0, dmg: 56 }, { dist: 40, dmg: 50 }, { dist: 80, dmg: 44 }, { dist: 100, dmg: 40 }] },
  { name: 'MK.78',       category: 'LMG', color: '#ff6600', ranges: [{ dist: 0, dmg: 38 }, { dist: 50, dmg: 35 }, { dist: 100, dmg: 31 }, { dist: 150, dmg: 27 }] },
  { name: 'Dravec 45',   category: 'SMG', color: '#8888ff', ranges: [{ dist: 0, dmg: 26 }, { dist: 14, dmg: 20 }, { dist: 28, dmg: 15 }, { dist: 60, dmg: 10 }] },
];

const DIST_LABELS = [0, 15, 30, 60, 100];

function getDamageAt(weapon: typeof WEAPONS[0], dist: number): number {
  const sorted = [...weapon.ranges].sort((a, b) => b.dist - a.dist);
  const entry = sorted.find(r => dist >= r.dist) ?? weapon.ranges[0];
  return entry.dmg;
}

export default function DamageChart() {
  const [selected, setSelected] = useState<string[]>(['Kogot-7', 'DS20 Mirage']);
  const [activeRange, setActiveRange] = useState(30);

  const toggle = (name: string) => {
    setSelected(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : prev.length < 4 ? [...prev, name] : prev
    );
  };

  const selectedWeapons = WEAPONS.filter(w => selected.includes(w.name));
  const maxDmg = 60;

  return (
    <div style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: '4px', marginBottom: '3rem', overflow: 'hidden', fontFamily: 'monospace' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)' }}>
        <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', opacity: 0.4, marginBottom: '0.3rem' }}>WEAPON ANALYSIS</div>
        <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.08em' }}>DAMAGE CHART</div>
      </div>

      {/* Weapon selector */}
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: '0.45rem', letterSpacing: '0.15em', opacity: 0.4, marginBottom: '0.6rem' }}>SELECT WEAPONS (MAX 4)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {WEAPONS.map(w => {
            const isOn = selected.includes(w.name);
            return (
              <button
                key={w.name}
                onClick={() => toggle(w.name)}
                style={{
                  padding: '4px 10px',
                  border: `1px solid ${isOn ? w.color : 'rgba(0,0,0,0.12)'}`,
                  borderRadius: '2px',
                  background: isOn ? `${w.color}18` : 'transparent',
                  color: isOn ? w.color : 'inherit',
                  fontSize: '0.55rem',
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  opacity: !isOn && selected.length >= 4 ? 0.35 : 1,
                }}
              >
                {w.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Range selector */}
      <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.45rem', letterSpacing: '0.15em', opacity: 0.4, marginRight: '0.5rem' }}>RANGE</span>
        {DIST_LABELS.map(d => (
          <button
            key={d}
            onClick={() => setActiveRange(d)}
            style={{
              padding: '3px 10px',
              border: `1px solid ${activeRange === d ? 'currentColor' : 'rgba(0,0,0,0.12)'}`,
              borderRadius: '2px',
              background: 'transparent',
              fontSize: '0.55rem',
              letterSpacing: '0.08em',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontWeight: activeRange === d ? 700 : 400,
              opacity: activeRange === d ? 1 : 0.5,
            }}
          >
            {d}m
          </button>
        ))}
      </div>

      {/* Chart */}
      <div style={{ padding: '1.5rem' }}>
        {selectedWeapons.length === 0 && (
          <div style={{ textAlign: 'center', opacity: 0.35, fontSize: '0.6rem', padding: '2rem 0' }}>SELECT AT LEAST ONE WEAPON</div>
        )}
        {selectedWeapons.map(w => {
          const dmg = getDamageAt(w, activeRange);
          const pct = (dmg / maxDmg) * 100;
          return (
            <div key={w.name} style={{ marginBottom: '1.1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: w.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>{w.name}</span>
                  <span style={{ fontSize: '0.45rem', opacity: 0.4, letterSpacing: '0.1em' }}>{w.category}</span>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: w.color }}>{dmg} DMG</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(0,0,0,0.07)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: w.color, transition: 'width 0.3s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                {DIST_LABELS.slice(0, 4).map(d => (
                  <span key={d} style={{ fontSize: '0.4rem', opacity: 0.3 }}>{d}m: {getDamageAt(w, d)}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '0.6rem 1.5rem', borderTop: '1px solid rgba(0,0,0,0.08)', fontSize: '0.5rem', letterSpacing: '0.12em', opacity: 0.3 }}>
        DAMAGE VALUES BASED ON BODY SHOTS — HEADSHOT MULTIPLIER NOT INCLUDED
      </div>
    </div>
  );
}
