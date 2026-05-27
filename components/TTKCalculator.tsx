'use client';

import { useState } from 'react';

interface Weapon {
  name: string;
  category: string;
  damage: number;
  rpm: number;
  ranges: { dist: number; damage: number }[];
}

const WEAPONS: Weapon[] = [
  { name: 'Kogot-7',     category: 'SMG', damage: 28, rpm: 800,  ranges: [{ dist: 0, damage: 28 }, { dist: 15, damage: 22 }, { dist: 30, damage: 17 }] },
  { name: 'VST',         category: 'SMG', damage: 32, rpm: 720,  ranges: [{ dist: 0, damage: 32 }, { dist: 12, damage: 25 }, { dist: 25, damage: 19 }] },
  { name: 'Carbon 57',   category: 'SMG', damage: 27, rpm: 750,  ranges: [{ dist: 0, damage: 27 }, { dist: 18, damage: 21 }, { dist: 35, damage: 16 }] },
  { name: 'DS20 Mirage', category: 'AR',  damage: 33, rpm: 600,  ranges: [{ dist: 0, damage: 33 }, { dist: 30, damage: 30 }, { dist: 60, damage: 26 }] },
  { name: 'Voyak KT-3',  category: 'AR',  damage: 35, rpm: 560,  ranges: [{ dist: 0, damage: 35 }, { dist: 30, damage: 32 }, { dist: 60, damage: 28 }] },
  { name: 'M15 MOD 0',   category: 'AR',  damage: 56, rpm: 280,  ranges: [{ dist: 0, damage: 56 }, { dist: 40, damage: 50 }, { dist: 80, damage: 44 }] },
  { name: 'MK.78',       category: 'LMG', damage: 38, rpm: 480,  ranges: [{ dist: 0, damage: 38 }, { dist: 50, damage: 35 }, { dist: 100, damage: 31 }] },
  { name: 'Dravec 45',   category: 'SMG', damage: 26, rpm: 780,  ranges: [{ dist: 0, damage: 26 }, { dist: 14, damage: 20 }, { dist: 28, damage: 15 }] },
];

const HP_OPTIONS = [
  { label: '0 plates — 100 HP',  hp: 100 },
  { label: '1 plate  — 150 HP',  hp: 150 },
  { label: '2 plates — 200 HP',  hp: 200 },
  { label: '3 plates — 250 HP',  hp: 250 },
];

const DIST_OPTIONS = [0, 15, 30, 60];

function calcTTK(weapon: Weapon, hp: number, dist: number): { ttk: number; stk: number; dmg: number } {
  const rangeEntry = [...weapon.ranges].reverse().find(r => dist >= r.dist) ?? weapon.ranges[0];
  const dmg = rangeEntry.damage;
  const stk = Math.ceil(hp / dmg);
  const ttk = Math.round(((stk - 1) / (weapon.rpm / 60)) * 1000);
  return { ttk, stk, dmg };
}

function getTTKColor(ttk: number): string {
  if (ttk < 300) return '#00ff88';
  if (ttk < 500) return '#ffcc00';
  return '#ff4455';
}

export default function TTKCalculator() {
  const [weaponA, setWeaponA] = useState(WEAPONS[0].name);
  const [weaponB, setWeaponB] = useState(WEAPONS[3].name);
  const [hp, setHp] = useState(250);
  const [dist, setDist] = useState(0);

  const wA = WEAPONS.find(w => w.name === weaponA)!;
  const wB = WEAPONS.find(w => w.name === weaponB)!;
  const rA = calcTTK(wA, hp, dist);
  const rB = calcTTK(wB, hp, dist);

  const maxTTK = Math.max(rA.ttk, rB.ttk, 1);

  return (
    <div style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: '4px', marginBottom: '3rem', overflow: 'hidden', fontFamily: 'monospace' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.02)' }}>
        <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', opacity: 0.4, marginBottom: '0.3rem' }}>WEAPON ANALYSIS</div>
        <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.08em' }}>TTK CALCULATOR</div>
      </div>

      {/* Controls */}
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', flexWrap: 'wrap' }}>
        {[
          { label: 'WEAPON A', value: weaponA, set: setWeaponA },
          { label: 'WEAPON B', value: weaponB, set: setWeaponB },
        ].map(({ label, value, set }) => (
          <div key={label}>
            <div style={{ fontSize: '0.45rem', letterSpacing: '0.15em', opacity: 0.4, marginBottom: '0.35rem' }}>{label}</div>
            <select
              value={value}
              onChange={e => set(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '0.6rem', padding: '4px 6px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '2px', background: 'transparent', width: '100%', cursor: 'pointer' }}
            >
              {WEAPONS.map(w => <option key={w.name} value={w.name}>{w.name} ({w.category})</option>)}
            </select>
          </div>
        ))}
        <div>
          <div style={{ fontSize: '0.45rem', letterSpacing: '0.15em', opacity: 0.4, marginBottom: '0.35rem' }}>ARMOR</div>
          <select
            value={hp}
            onChange={e => setHp(Number(e.target.value))}
            style={{ fontFamily: 'monospace', fontSize: '0.6rem', padding: '4px 6px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '2px', background: 'transparent', width: '100%', cursor: 'pointer' }}
          >
            {HP_OPTIONS.map(o => <option key={o.hp} value={o.hp}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: '0.45rem', letterSpacing: '0.15em', opacity: 0.4, marginBottom: '0.35rem' }}>DISTANCE (m)</div>
          <select
            value={dist}
            onChange={e => setDist(Number(e.target.value))}
            style={{ fontFamily: 'monospace', fontSize: '0.6rem', padding: '4px 6px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '2px', background: 'transparent', width: '100%', cursor: 'pointer' }}
          >
            {DIST_OPTIONS.map(d => <option key={d} value={d}>{d}m</option>)}
          </select>
        </div>
      </div>

      {/* Results */}
      <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {[{ w: wA, r: rA }, { w: wB, r: rB }].map(({ w, r }, idx) => (
          <div key={idx} style={{ padding: '1.25rem', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '3px' }}>
            <div style={{ fontSize: '0.5rem', letterSpacing: '0.15em', opacity: 0.4, marginBottom: '0.3rem' }}>{w.category}</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '1rem' }}>{w.name}</div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.55rem', opacity: 0.5 }}>TTK</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: getTTKColor(r.ttk) }}>{r.ttk} ms</span>
              </div>
              <div style={{ height: '4px', background: 'rgba(0,0,0,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(r.ttk / maxTTK) * 100}%`, background: getTTKColor(r.ttk), transition: 'width 0.3s' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              {[
                { label: 'SHOTS', value: r.stk },
                { label: 'DMG/SHOT', value: `${r.dmg}` },
                { label: 'RPM', value: w.rpm },
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.03)', borderRadius: '2px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>{value}</div>
                  <div style={{ fontSize: '0.4rem', letterSpacing: '0.1em', opacity: 0.4 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '0.6rem 1.5rem', borderTop: '1px solid rgba(0,0,0,0.08)', fontSize: '0.5rem', letterSpacing: '0.12em', opacity: 0.3 }}>
        TTK = TIME TO KILL — ASSUMES ALL SHOTS HIT BODY / NO HEADSHOT MULTIPLIER
      </div>
    </div>
  );
}
